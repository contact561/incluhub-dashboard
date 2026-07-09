import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ⚠️  SERVER-ONLY — DO NOT import this file in any Client Component.
 *
 * This client uses the SERVICE ROLE KEY which bypasses all RLS policies.
 * It must only be used in:
 * - Server Actions that require admin-level DB access
 * - Secure Route Handlers
 * - Scripts that run server-side only
 *
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Ensure these are set in .env.local and never exposed to the browser."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
