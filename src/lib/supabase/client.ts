import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Browser-side Supabase client (used in client components).
export function createClient() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
