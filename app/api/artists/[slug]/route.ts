import { check, HttpError, route } from "@/lib/http";
import { artist, work } from "@/lib/present";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ slug: string }> };

// GET /api/artists/:slug → public profile with portfolio in the artist's order.
// RLS hides pending/hidden artists from everyone but themselves.
export const GET = route(async (_request: Request, { params }: Ctx) => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: a, error } = await supabase.from("artists").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  check(error);
  if (!a) throw new HttpError(404, "Artist not found");

  const { data: works, error: worksError } = await supabase
    .from("works")
    .select("id, image_path, thumb_path, width, height, caption, created_at, feel_weight, feel_detail, feel_color, feel_scale, work_tags(tag)")
    .eq("artist_id", a.id)
    .eq("published", true)
    .order("position")
    .order("created_at", { ascending: false });
  check(worksError);

  return Response.json({ artist: artist(a), works: works!.map((w) => work(w)) });
});
