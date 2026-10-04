import { check, HttpError, parse, route } from "@/lib/http";
import { decodeCursor, encodeCursor, likeSafe, work } from "@/lib/present";
import { exploreQuery } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// GET /api/works?style=fine-line,japanese&vibe=traveler&q=&cursor=&limit=30
// The explore grid: newest first, `next` is the cursor for the following page.
export const GET = route(async (request: Request) => {
  const query = parse(Object.fromEntries(new URL(request.url).searchParams), exploreQuery);
  const cursor = decodeCursor(query.cursor);
  if (query.cursor && !cursor) throw new HttpError(422, "Invalid cursor");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("explore_works", {
    p_styles: query.style,
    p_vibes: query.vibe,
    p_q: likeSafe(query.q),
    p_before: cursor?.before,
    p_before_id: cursor?.id,
    p_limit: query.limit,
  });
  check(error);

  const rows = data ?? [];
  const last = rows.at(-1);
  return Response.json({
    works: rows.map((r) => ({
      ...work(r),
      artist: { slug: r.artist_slug, name: r.artist_name, studio: r.artist_studio },
    })),
    next: rows.length === query.limit && last ? encodeCursor(last.created_at, last.id) : null,
  });
});
