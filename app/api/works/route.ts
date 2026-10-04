import { exploreWorks } from "@/lib/explore";
import { HttpError, parse, route } from "@/lib/http";
import { decodeCursor } from "@/lib/present";
import { exploreQuery } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// GET /api/works?style=fine-line,japanese&vibe=traveler&q=&cursor=&limit=30
// The explore grid: newest first, `next` is the cursor for the following page.
export const GET = route(async (request: Request) => {
  const query = parse(Object.fromEntries(new URL(request.url).searchParams), exploreQuery);
  const cursor = decodeCursor(query.cursor);
  if (query.cursor && !cursor) throw new HttpError(422, "Invalid cursor");

  return Response.json(await exploreWorks(await createClient(), { ...query, cursor }));
});
