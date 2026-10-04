import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for email links (?token_hash=&type=) and Google (?code=).
// Sends artists without a profile to finish signing up, everyone else to the dashboard.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const supabase = await createClient();

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  if (!ok) return NextResponse.redirect(new URL("/login?error=link", url.origin));

  const { data } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("artists").select("id").eq("id", data.user!.id).maybeSingle();
  return NextResponse.redirect(new URL(profile ? "/dashboard" : "/join", url.origin));
}
