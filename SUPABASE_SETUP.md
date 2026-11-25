# Supabase Setup (replaces Appwrite)

This project now uses **Supabase** for:
- Admin login / session (`supabase.auth`)
- Portfolio projects (`projects` table)
- Images and videos (`portfolio` Storage bucket)

The old `appwrite` package and its config/service files have been removed.

---

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard → **New project**.
2. Copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **publishable / anon key** → `Project Settings → API Keys → Publishable key` (starts with `sb_publishable_...` or `eyJ...`)

> The publishable/anon key is safe to expose in a static site. Access is controlled by RLS policies.
>
> ⚠️ **Never** put the `sb_secret_...` key in `.env`, frontend code, or a public repo. It bypasses RLS. If it was ever shared publicly, rotate it in `Project Settings → API Keys`.

---

## 2. Add credentials to the app

Create a `.env` file in the project root (it is git-ignored):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

Then restart `npm run dev`.

**For cPanel / Netlify:** Vite embeds these values at **build time**, so set them before running `npm run build`. If you cannot set env vars on the host, replace the placeholders directly in `src/config/supabase.js` and rebuild.

---

## 3. Run the database + storage SQL

Open **Supabase Dashboard → SQL Editor → New query**, paste this, and run:

```sql
create extension if not exists pgcrypto;

-- Projects table. Column names are camelCase on purpose so the React code
-- can keep using project.imageId, project.galleryImages, etc.
create table if not exists public."projects" (
  "id" uuid primary key default gen_random_uuid(),
  "createdAt" timestamptz not null default now(),
  "title" text not null,
  "categories" text[] not null default '{}',
  "description" text not null,
  "details" text not null default '',
  "technologies" text[] not null default '{}',
  "imageId" text,
  "galleryImages" text[] not null default '{}',
  "videoUrl" text not null default '',
  "videoId" text,
  "liveDemo" text not null default ''
);

alter table public."projects" enable row level security;

drop policy if exists "Public can read projects" on public."projects";
create policy "Public can read projects"
  on public."projects" for select
  using (true);

drop policy if exists "Admins can insert projects" on public."projects";
create policy "Admins can insert projects"
  on public."projects" for insert to authenticated
  with check (true);

drop policy if exists "Admins can update projects" on public."projects";
create policy "Admins can update projects"
  on public."projects" for update to authenticated
  using (true) with check (true);

drop policy if exists "Admins can delete projects" on public."projects";
create policy "Admins can delete projects"
  on public."projects" for delete to authenticated
  using (true);

-- Public storage bucket for images/videos
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view portfolio files" on storage.objects;
create policy "Public can view portfolio files"
  on storage.objects for select
  using (bucket_id = 'portfolio');

drop policy if exists "Admins can upload portfolio files" on storage.objects;
create policy "Admins can upload portfolio files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio');

drop policy if exists "Admins can update portfolio files" on storage.objects;
create policy "Admins can update portfolio files"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio');

drop policy if exists "Admins can delete portfolio files" on storage.objects;
create policy "Admins can delete portfolio files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio');
```

---

## 4. Create the admin user

**Authentication → Users → Add user → Create user**

- Email: your admin email
- Password: a strong password
- Tick **Auto Confirm User** (otherwise login will fail until confirmed)

Alternatively, the app's `register()` flow can create one, but you still need to confirm the email.

Also add your domains under **Authentication → URL Configuration**:
- Site URL: `http://localhost:5173` while developing, then your cPanel domain
- Redirect URLs: add both `http://localhost:5173/**` and `https://your-domain.com/**`

---

## 5. Migrate existing Appwrite data (optional)

A migration script is included. It reads the 9 Appwrite documents, downloads every cover/gallery/video file, uploads them to the `portfolio` bucket, and inserts the rows into `projects`.

1. Make a copy of `.env.migration.example` → `.env.migration` (git-ignored).
2. Set **either** `SUPABASE_ADMIN_EMAIL` + `SUPABASE_ADMIN_PASSWORD`, **or** a freshly rotated `SUPABASE_SERVICE_KEY`.
3. Run:
   ```bash
   npm run migrate
   ```
4. Re-run safely: already-migrated projects (same title + createdAt) are skipped.

The manual mapping notes below are only needed if you prefer to do it by hand:

### Projects
1. Export the `projects` documents from Appwrite as JSON.
2. For each document, build a Supabase row:
   - Drop Appwrite system fields: `$id`, `$collectionId`, `$databaseId`, `$permissions`, `$updatedAt`
   - `$createdAt` → `createdAt`
   - Old single `category` → `categories: [category]`
   - Keep `title`, `description`, `details`, `technologies`, `videoUrl`, `liveDemo`
   - Leave `id` empty so Supabase generates a UUID
3. Import via **Table Editor → Insert → Import data from JSON/CSV**, or use:
   ```js
   await supabase.from('projects').insert(rows);
   ```

### Files
1. Download each file from Appwrite Storage (use the public view URL from the old `getFileView()`).
2. Upload it to the Supabase **portfolio** bucket (Table Editor isn't needed; use Storage → Upload file or `supabase.storage.from('portfolio').upload(path, file)`).
3. Replace stored values in the project rows:
   - `imageId` → new storage path (e.g. `1700000000-abc123-my-image.jpg`)
   - `galleryImages[]` → new paths
   - `videoId` → new path
   
   The app calls `getFileView(path)` to turn those paths into public URLs automatically. If you prefer, you can store a full `https://...` URL instead — the service passes URLs through unchanged.

---

## 6. Test

```bash
npm run dev
```

- `/` → projects load (or placeholders if the table is empty)
- `/admin/login` → login with the Supabase user
- `/admin/dashboard` → add / edit / delete a project, upload an image and a video
- Open a project → gallery navigation and video playback work

---

## Notes

- Supabase free plan has a **50 MB max per file**, so the dashboard now limits uploaded videos to 50 MB. Use YouTube/Vimeo links for bigger videos.
- If you renamed the table or bucket, update `projectsTable` / `storageBucket` in `src/config/supabase.js`.
- The public site only needs `SELECT` on `projects` and `SELECT` on the bucket. All write policies are `to authenticated`.
- Old `APPWRITE_*.md` files are kept for reference only; they no longer describe the active backend.
