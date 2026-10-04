import { check, parse, route } from "@/lib/http";
import { likeSafe } from "@/lib/present";
import { artistQuery } from "@/lib/schemas";
import { publicUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

// GET /api/artists?q=ana&style=blackwork&limit=24&offset=0
export const GET = route(async (request: Request) => {
  const query = parse(Object.fromEntries(new URL(request.url).searchParams), artistQuery);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_artists", {
    p_q: likeSafe(query.q),
    p_styles: query.style,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  check(error);

  const rows = data ?? [];
  return Response.json({
    artists: rows.map((a) => ({
      slug: a.slug,
      name: a.display_name,
      studio: a.studio,
      city: a.city,
      avatar: publicUrl("avatars", a.avatar_path),
      price: { from: a.price_from, to: a.price_to, currency: "GEL" },
      languages: a.languages,
      styles: a.styles,
      work_count: Number(a.work_count),
      preview: (a.preview as string[]).map((p) => publicUrl("works", p)),
    })),
    next_offset: rows.length === query.limit ? query.offset + query.limit : null,
  });
});
