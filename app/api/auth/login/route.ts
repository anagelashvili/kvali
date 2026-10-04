import { siteUrl } from "@/lib/env";
import { clientKey, HttpError, readBody, route } from "@/lib/http";
import { limit } from "@/lib/rate";
import { loginEmail } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/login { email } — emails a sign-in link plus a 6-digit code.
// The same call registers new artists; their profile is created afterwards
// with POST /api/me.
export const POST = route(async (request: Request) => {
  const { email } = await readBody(request, loginEmail);
  await limit("login", clientKey(request), 8, "15 minutes");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });
  if (error) {
    if (error.status === 429) throw new HttpError(429, "Too many emails, wait a minute and try again");
    throw new HttpError(400, error.message);
  }
  return Response.json({ ok: true });
});
