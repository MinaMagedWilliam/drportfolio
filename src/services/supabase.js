import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../config/supabase';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const isHttpUrl = (value) =>
  typeof value === 'string' && /^(https?:)?\/\//i.test(value.trim());

class SupabaseService {
  client = supabase;

  // ---------------- Auth ----------------
  async login(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.session;
  }

  async logout() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    return true;
  }

  async getCurrentUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error) return null;
    return data?.user ?? null;
  }

  async createAccount(email, password, name) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data.session ?? data.user;
  }

  // ---------------- Projects ----------------
  async getProjects() {
    const { data, error } = await this.client
      .from(supabaseConfig.projectsTable)
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getProject(id) {
    const { data, error } = await this.client
      .from(supabaseConfig.projectsTable)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createProject(project) {
    const { data, error } = await this.client
      .from(supabaseConfig.projectsTable)
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProject(id, project) {
    const { data, error } = await this.client
      .from(supabaseConfig.projectsTable)
      .update(project)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProject(id) {
    const { error } = await this.client
      .from(supabaseConfig.projectsTable)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // ---------------- Storage ----------------
  async uploadFile(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

    const { error } = await this.client.storage
      .from(supabaseConfig.storageBucket)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) throw error;

    // We keep `id` as an alias so the dashboard code stays simple.
    // What is actually stored in the database is the storage `path`.
    return { id: path, path, publicUrl: this.getFileView(path) };
  }

  getFileView(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (isHttpUrl(pathOrUrl)) return pathOrUrl;

    const { data } = this.client.storage
      .from(supabaseConfig.storageBucket)
      .getPublicUrl(pathOrUrl);

    return data?.publicUrl ?? null;
  }

  getFilePreview(pathOrUrl) {
    return this.getFileView(pathOrUrl);
  }

  async deleteFile(pathOrUrl) {
    const path = this.toStoragePath(pathOrUrl);
    if (!path) throw new Error('Invalid Supabase storage path');

    const { error } = await this.client.storage
      .from(supabaseConfig.storageBucket)
      .remove([path]);

    if (error) throw error;
    return true;
  }

  toStoragePath(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (!isHttpUrl(pathOrUrl)) return pathOrUrl;

    try {
      const url = new URL(pathOrUrl);
      const marker = `/storage/v1/object/public/${supabaseConfig.storageBucket}/`;
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;
