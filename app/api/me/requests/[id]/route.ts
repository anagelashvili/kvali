import { check, HttpError, readBody, requireArtist, route } from "@/lib/http";
import { requestStatus } from "@/lib/schemas";
import { signedReferenceUrls } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requestId(params: Ctx["params"]) {
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new HttpError(404, "Request not found");
  return id;
}

// GET /api/me/requests/:id — full request with contact details and
// reference image links valid for one hour.
export const GET = route(async (_request: Request, { params }: Ctx) => {
  const id = await requestId(params);
  const { supabase, user } = await requireArtist();
  const { data, error } = await supabase.from("requests").select("*").eq("id", id).eq("artist_id", user.id).maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Request not found");

  const { reference_paths, artist_id: _artist, ...rest } = data;
  return Response.json({ request: { ...rest, references: await signedReferenceUrls(reference_paths) } });
});

// PATCH /api/me/requests/:id { status: "replied" | "booked" | "declined" | "new" }
export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const id = await requestId(params);
  const { supabase, user } = await requireArtist();
  const { status } = await readBody(request, requestStatus);
  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id)
    .eq("artist_id", user.id)
    .select("id, status, updated_at")
    .maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Request not found");
  return Response.json({ request: data });
});
