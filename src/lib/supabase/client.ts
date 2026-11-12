import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-id")
  );
};

export const createClient = () => {
  // Use dummy fallback if not configured to prevent crashes during build or pre-config
  const url = isSupabaseConfigured() ? supabaseUrl : "https://placeholder-project.supabase.co";
  const key = isSupabaseConfigured() ? supabaseAnonKey : "placeholder-anon-key";

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase = createClient();
