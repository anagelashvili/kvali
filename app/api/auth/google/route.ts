import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { HttpError, route } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

// GET /api/auth/google — redirects to Google; Google returns to /auth/confirm.
export const GET = route(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/confirm` },
  });
  if (error || !data.url) throw new HttpError(503, "Google sign-in is not set up yet");
  return NextResponse.redirect(data.url);
});
