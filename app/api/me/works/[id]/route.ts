import { check, HttpError, readBody, requireArtist, route } from "@/lib/http";
import { work } from "@/lib/present";
import { updateWork } from "@/lib/schemas";
import { remove } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

const COLUMNS = "id, image_path, thumb_path, width, height, caption, position, published, created_at, work_tags(tag)";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function workId(params: Ctx["params"]) {
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new HttpError(404, "Work not found");
  return id;
}

// PATCH /api/me/works/:id { caption?, tags?, published? } — tags replace the existing set.
export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const id = await workId(params);
  const { supabase, user } = await requireArtist();
  const { tags, ...fields } = await readBody(request, updateWork);

  const { data: existing, error } = await supabase
    .from("works")
    .select("id")
    .eq("id", id)
    .eq("artist_id", user.id)
    .maybeSingle();
  check(error);
  if (!existing) throw new HttpError(404, "Work not found");

  if (Object.keys(fields).length) {
    const { error: updateError } = await supabase.from("works").update(fields).eq("id", id);
    check(updateError);
  }

  if (tags) {
    const { data: current, error: readError } = await supabase.from("work_tags").select("tag").eq("work_id", id);
    check(readError);
    const have = new Set(current!.map((t) => t.tag));
    const add = tags.filter((t) => !have.has(t));
    const drop = [...have].filter((t) => !tags.includes(t));
    if (add.length) check((await supabase.from("work_tags").insert(add.map((tag) => ({ work_id: id, tag })))).error);
    if (drop.length) check((await supabase.from("work_tags").delete().eq("work_id", id).in("tag", drop)).error);
  }

  const { data, error: readBack } = await supabase.from("works").select(COLUMNS).eq("id", id).single();
  check(readBack);
  return Response.json({ work: work(data!, { own: true }) });
});

// DELETE /api/me/works/:id
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const id = await workId(params);
  const { supabase, user } = await requireArtist();
  const { data, error } = await supabase
    .from("works")
    .delete()
    .eq("id", id)
    .eq("artist_id", user.id)
    .select("image_path, thumb_path")
    .maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Work not found");
  await remove("works", [data.image_path, data.thumb_path]);
  return new Response(null, { status: 204 });
});
