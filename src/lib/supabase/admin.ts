import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./config";

// Service-role client — bypasses RLS. Server-only; used to write the snapshot
// cache (balance_snapshot / holding_rows) which has no client-write policy.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasAdminClient = Boolean(
  isSupabaseConfigured && SERVICE_ROLE_KEY,
);

export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
