import { route } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/logout
export const POST = route(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
});
