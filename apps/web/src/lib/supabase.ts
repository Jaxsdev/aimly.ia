import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ttigmqwjtevmnrwfmnxj.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aWdtcXdqdGV2bW5yd2ZtbnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMTI2OTUsImV4cCI6MjEwMTc4ODY5NX0.3O1T0ZaDyG451Lsm2sxAlvgx_8844UBzmkOuGgDKngY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current session JWT to pass to the API
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
