import { createClient } from "@supabase/supabase-js";

// The publishable key is designed to be shipped to the browser: every request
// it makes is still filtered by the database's own row-level rules.
export const SUPABASE_URL = "https://ohziashwykmpnjlnyaxt.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_6FVLfdZdJXv_ZqqsF5Ufpg_DsMae3qc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});