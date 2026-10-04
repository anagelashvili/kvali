import { check, HttpError, readBody, requireArtist, route } from "@/lib/http";
import { reorderWorks } from "@/lib/schemas";

// PUT /api/me/works/order { ids: [...] } — the full portfolio in its new order.
export const PUT = route(async (request: Request) => {
  const { supabase, user } = await requireArtist();
  const { ids } = await readBody(request, reorderWorks);

  const { data: mine, error } = await supabase.from("works").select("id").eq("artist_id", user.id);
  check(error);
  const owned = new Set(mine!.map((w) => w.id));
  if (ids.length !== owned.size || new Set(ids).size !== ids.length || !ids.every((id) => owned.has(id))) {
    throw new HttpError(422, "Send every one of your works exactly once");
  }

  const results = await Promise.all(
    ids.map((id, position) => supabase.from("works").update({ position }).eq("id", id)),
  );
  results.forEach((r) => check(r.error));
  return new Response(null, { status: 204 });
});
