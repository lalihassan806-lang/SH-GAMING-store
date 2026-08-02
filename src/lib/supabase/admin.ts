import { createClient } from "@supabase/supabase-js";

// Service-role client. Use ONLY inside server actions/route handlers
// where you have already verified the caller is an admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
