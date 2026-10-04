import { toAvatar } from "@/lib/images";
import { check, readBody, requireArtist, route } from "@/lib/http";
import { artist } from "@/lib/present";
import { avatar } from "@/lib/schemas";
import { put, readIncoming, remove, removeIncoming } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/me/avatar { path } — path from POST /api/uploads { kind: "avatar" }
export const POST = route(async (request: Request) => {
  const { user, artist: current } = await requireArtist();
  const { path } = await readBody(request, avatar);

  const data = await toAvatar(await readIncoming(path, `art/${user.id}`));
  // new file name each time so CDNs never serve the old picture
  const target = `${user.id}/${crypto.randomUUID()}.webp`;
  await put("avatars", target, data);

  const { data: updated, error } = await createAdminClient()
    .from("artists")
    .update({ avatar_path: target })
    .eq("id", user.id)
    .select("*")
    .single();
  check(error);

  if (current.avatar_path) await remove("avatars", [current.avatar_path]);
  await removeIncoming([path]);
  return Response.json({ artist: artist(updated!, { own: true }) });
});

// DELETE /api/me/avatar
export const DELETE = route(async () => {
  const { user, artist: current } = await requireArtist();
  const { error } = await createAdminClient().from("artists").update({ avatar_path: null }).eq("id", user.id);
  check(error);
  if (current.avatar_path) await remove("avatars", [current.avatar_path]);
  return new Response(null, { status: 204 });
});
