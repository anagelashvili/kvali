import { z } from "zod";
import { check, parse, requireArtist, route } from "@/lib/http";
import { REQUEST_STATUSES } from "@/lib/schemas";

const query = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/me/requests?status=new — the artist's inbox, newest first, with counts per status.
export const GET = route(async (request: Request) => {
  const q = parse(Object.fromEntries(new URL(request.url).searchParams), query);
  const { supabase, user } = await requireArtist();

  let list = supabase
    .from("requests")
    .select("id, idea, placement, size, body_zone, size_cm, style, contact_name, language, status, created_at, reference_paths")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false })
    .range(q.offset, q.offset + q.limit - 1);
  if (q.status) list = list.eq("status", q.status);

  const [{ data, error }, { data: all, error: countError }] = await Promise.all([
    list,
    supabase.from("requests").select("status").eq("artist_id", user.id),
  ]);
  check(error);
  check(countError);

  const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  all!.forEach((r) => counts[r.status]++);

  return Response.json({
    requests: data!.map(({ reference_paths, ...r }) => ({ ...r, reference_count: reference_paths.length })),
    counts,
    next_offset: data!.length === q.limit ? q.offset + q.limit : null,
  });
});
