import { clientKey, HttpError, readBody, route } from "@/lib/http";
import { limit } from "@/lib/rate";
import { uploadTicket } from "@/lib/schemas";
import { createUploadTicket } from "@/lib/storage";
import { getUser } from "@/lib/supabase/server";

// POST /api/uploads { kind: "work" | "avatar" | "reference" }
// Returns a one-time signed URL. The browser uploads the file straight to
// Supabase Storage (so big phone photos skip Vercel's body limit):
//   supabase.storage.from("incoming").uploadToSignedUrl(path, token, file)
// then passes `path` to the endpoint that uses it (works, avatar, request).
export const POST = route(async (request: Request) => {
  const { kind } = await readBody(request, uploadTicket);

  if (kind === "reference") {
    await limit("upload-ref", clientKey(request), 15, "1 hour");
    return Response.json(await createUploadTicket(kind, null), { status: 201 });
  }

  const { user } = await getUser();
  if (!user) throw new HttpError(401, "Sign in required");
  await limit("upload-art", user.id, 300, "1 day");
  return Response.json(await createUploadTicket(kind, user.id), { status: 201 });
});
