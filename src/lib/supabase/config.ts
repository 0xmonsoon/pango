// Lets the app boot and render before real Supabase keys are added.
// Once NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are set in .env.local, auth turns on.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("http") &&
    !SUPABASE_URL.includes("your-project"),
);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
