import { createClient } from '@supabase/supabase-js';

/**
 * One-way migration: Appwrite (documents + storage files) -> Supabase.
 *
 * Run with:
 *   npm run migrate
 *
 * Credentials come from .env and .env.migration (both git-ignored).
 * Prefer admin email/password over a secret key: the script signs in with the
 * publishable key, so all writes are done as an authenticated admin and RLS
 * policies stay in charge.
 */

const {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  SUPABASE_SERVICE_KEY: serviceKey,
  SUPABASE_ADMIN_EMAIL: adminEmail,
  SUPABASE_ADMIN_PASSWORD: adminPassword,

  APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID = '68ed8a8f0032cd3c025c',
  APPWRITE_DATABASE_ID = '68ed8ab9002eb2e1dbf8',
  APPWRITE_COLLECTION_ID = 'projects',
  APPWRITE_BUCKET_ID = '68ed8c6f00079b6e068e',
  SUPABASE_STORAGE_BUCKET = 'portfolio',
} = process.env;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Add it to .env');
}

if (!serviceKey && (!adminEmail || !adminPassword)) {
  throw new Error(
    'Fill SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD in .env.migration, or set SUPABASE_SERVICE_KEY after rotating it.'
  );
}

const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (serviceKey) {
  console.log('🔐 Using Supabase service key (RLS bypass)');
} else {
  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (error) throw new Error(`Supabase login failed: ${error.message}`);
  console.log(`🔐 Logged in as ${adminEmail}`);
}

const appwriteHeaders = { 'X-Appwrite-Project': APPWRITE_PROJECT_ID };
const fileCache = new Map();
let migratedFiles = 0;

const extensionFor = (contentType = '') => {
  const type = contentType.split(';')[0].trim().toLowerCase();
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
  };
  return map[type] || '';
};

async function migrateFile(fileId) {
  if (!fileId) return null;

  // Already a public URL -> keep it as-is; the app passes URLs through unchanged.
  if (/^https?:\/\//i.test(fileId)) return fileId;

  if (fileCache.has(fileId)) return fileCache.get(fileId);

  const viewUrl =
    `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}` +
    `/files/${encodeURIComponent(fileId)}/view?project=${APPWRITE_PROJECT_ID}`;

  try {
    const response = await fetch(viewUrl, { headers: appwriteHeaders });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    const path = `appwrite-${fileId}${extensionFor(contentType)}`;

    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(path, new Blob([buffer], { type: contentType }), {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    fileCache.set(fileId, path);
    migratedFiles += 1;
    return path;
  } catch (error) {
    console.warn(`⚠️  Could not migrate file ${fileId}: ${error.message}`);
    fileCache.set(fileId, null);
    return null;
  }
}

async function fetchAppwriteDocuments() {
  const documents = [];
  let offset = 0;

  while (true) {
    const url =
      `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}` +
      `/collections/${APPWRITE_COLLECTION_ID}/documents?limit=100&offset=${offset}`;

    const response = await fetch(url, { headers: appwriteHeaders });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Appwrite list failed (${response.status}): ${body}`);
    }

    const json = await response.json();
    const batch = json.documents ?? [];
    documents.push(...batch);

    if (batch.length < 100) break;
    offset += 100;
  }

  return documents;
}

function toRow(doc) {
  const categories = Array.isArray(doc.categories) && doc.categories.length
    ? doc.categories
    : doc.category
      ? [doc.category]
      : [];

  let technologies = [];
  if (Array.isArray(doc.technologies)) {
    technologies = doc.technologies;
  } else if (typeof doc.technologies === 'string') {
    technologies = doc.technologies.split(',').map((t) => t.trim()).filter(Boolean);
  }

  const createdAt = doc.$createdAt || new Date().toISOString();

  return {
    title: doc.title || 'Untitled',
    categories,
    description: doc.description || '',
    details: doc.details || '',
    technologies,
    videoUrl: doc.videoUrl || '',
    liveDemo: doc.liveDemo || '',
    createdAt,
  };
}

const rowKey = (row) => `${row.title}::${new Date(row.createdAt).toISOString()}`;

async function main() {
  console.log('📥 Reading Appwrite documents...');
  const documents = await fetchAppwriteDocuments();
  console.log(`   Found ${documents.length} project(s)`);

  if (!documents.length) {
    console.log('Nothing to migrate.');
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('projects')
    .select('title,createdAt');

  if (existingError) throw existingError;

  const seen = new Set(existing.map(rowKey));
  const rows = [];
  let skipped = 0;

  for (const doc of documents) {
    const row = toRow(doc);

    if (seen.has(rowKey(row))) {
      skipped += 1;
      continue;
    }

    console.log(`   Migrating files for: ${row.title}`);
    row.imageId = await migrateFile(doc.imageId);
    row.galleryImages = await Promise.all(
      (Array.isArray(doc.galleryImages) ? doc.galleryImages : []).map(migrateFile)
    );
    row.videoId = doc.videoId ? await migrateFile(doc.videoId) : null;
    row.galleryImages = row.galleryImages.filter(Boolean);

    rows.push(row);
    seen.add(rowKey(row));
  }

  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await supabase.from('projects').insert(rows.slice(i, i + 20));
    if (error) throw error;
  }

  console.log('\n✅ Migration complete');
  console.log(`   Projects inserted: ${rows.length}`);
  console.log(`   Projects skipped (already present): ${skipped}`);
  console.log(`   Files uploaded to Supabase: ${migratedFiles}`);
  console.log('\nAppwrite data was left untouched. Delete it manually when you are happy with the result.');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error.message);
  process.exitCode = 1;
});
