// Supabase Configuration
// You can set these in a .env file (recommended) or replace the placeholders below.
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key

const url = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabaseConfig = {
  url,
  anonKey,
  // Change these if you used different names in SUPABASE_SETUP.md
  projectsTable: 'projects',
  storageBucket: 'portfolio',
  isConfigured: !url.includes('your-project') && !anonKey.includes('your-anon-key'),
};

export default supabaseConfig;
