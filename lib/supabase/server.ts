import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publishableKey, secretKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Client acting as the signed-in user (or anon); RLS applies. */
export async function createClient() {
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Server Components can't set cookies; the proxy refreshes the session instead.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

/** Service-role client for writes that bypass RLS. Never expose to the browser. */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in user, verified with the auth server, or null. */
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
