import { toWebp } from "@/lib/images";
import { check, readBody, requireArtist, route } from "@/lib/http";
import { work } from "@/lib/present";
import { createWork } from "@/lib/schemas";
import { put, readIncoming, remove, removeIncoming } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, image_path, thumb_path, width, height, caption, position, published, created_at, feel_weight, feel_detail, feel_color, feel_scale, work_tags(tag)";

// GET /api/me/works — all of the artist's work, including unpublished, in portfolio order.
export const GET = route(async () => {
  const { supabase, user } = await requireArtist();
  const { data, error } = await supabase
    .from("works")
    .select(COLUMNS)
    .eq("artist_id", user.id)
    .order("position")
    .order("created_at", { ascending: false });
  check(error);
  return Response.json({ works: data!.map((w) => work(w, { own: true })) });
});

// POST /api/me/works { path, caption?, tags?: ["fine-line", "floral"], published? }
// `path` comes from POST /api/uploads { kind: "work" }. The image is resized to
// 2000px (full) and 640px (grid thumbnail), converted to WebP, metadata stripped.
export const POST = route(async (request: Request) => {
  const { user } = await requireArtist();
  const input = await readBody(request, createWork);
  const raw = await readIncoming(input.path, `art/${user.id}`);

  const id = crypto.randomUUID();
  const [full, thumb] = await Promise.all([toWebp(raw, 2000), toWebp(raw, 640, 78)]);
  const image_path = `${user.id}/${id}.webp`;
  const thumb_path = `${user.id}/${id}-thumb.webp`;
  await Promise.all([put("works", image_path, full.data), put("works", thumb_path, thumb.data)]);

  const admin = createAdminClient();
  try {
    // new work goes to the front of the portfolio
    const { data: first } = await admin
      .from("works")
      .select("position")
      .eq("artist_id", user.id)
      .order("position")
      .limit(1)
      .maybeSingle();

    const { error } = await admin.from("works").insert({
      id,
      artist_id: user.id,
      image_path,
      thumb_path,
      width: full.width,
      height: full.height,
      caption: input.caption ?? null,
      ...input.feel,
      published: input.published,
      position: (first?.position ?? 1) - 1,
    });
    check(error);

    if (input.tags.length) {
      const { error: tagError } = await admin.from("work_tags").insert(input.tags.map((tag) => ({ work_id: id, tag })));
      if (tagError) {
        await admin.from("works").delete().eq("id", id);
        check(tagError);
      }
    }
  } catch (e) {
    await remove("works", [image_path, thumb_path]);
    throw e;
  }

  await removeIncoming([input.path]);
  const { data, error } = await admin.from("works").select(COLUMNS).eq("id", id).single();
  check(error);
  return Response.json({ work: work(data!, { own: true }) }, { status: 201 });
});
