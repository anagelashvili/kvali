import { clientKey, HttpError, readBody, route } from "@/lib/http";
import { limit } from "@/lib/rate";
import { verifyCode } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/verify { email, code } — signs in with the 6-digit code from
// the email. Useful when the link opens in Instagram's in-app browser.
export const POST = route(async (request: Request) => {
  const { email, code } = await readBody(request, verifyCode);
  await limit("verify", clientKey(request), 10, "15 minutes");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user) throw new HttpError(401, "Wrong or expired code");
  return Response.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
});
