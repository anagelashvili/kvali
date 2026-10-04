import { check, route } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

// GET /api/tags → { styles: [...], vibes: [...] }
export const GET = route(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("slug, kind, name_en, name_ka").order("sort");
  check(error);
  const pick = (kind: string) =>
    data!.filter((t) => t.kind === kind).map((t) => ({ slug: t.slug, name: { en: t.name_en, ka: t.name_ka } }));
  return Response.json(
    { styles: pick("style"), vibes: pick("vibe") },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
});
