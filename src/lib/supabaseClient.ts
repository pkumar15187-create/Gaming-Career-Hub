import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://phrqxbbzxjibqsrxjubs.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2z2tbSSnLFNC8KJXtO9nDA_-lJW48t0';

export const isSupabaseConfigured = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) return false;
  return true;
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("🎮 Supabase connected successfully! Database operations are live on " + supabaseUrl);
