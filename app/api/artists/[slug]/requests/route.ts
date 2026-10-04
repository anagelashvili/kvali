import { after } from "next/server";
import { toWebp } from "@/lib/images";
import { check, clientKey, HttpError, readBody, route } from "@/lib/http";
import { notifyNewRequest } from "@/lib/notify";
import { limit } from "@/lib/rate";
import { sketchRequest } from "@/lib/schemas";
import { put, readIncoming, remove, removeIncoming } from "@/lib/storage";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ slug: string }> };

// POST /api/artists/:slug/requests — a visitor's sketch request.
// Reference images are uploaded first via POST /api/uploads { kind: "reference" }
// and passed here as their `path`s.
export const POST = route(async (request: Request, { params }: Ctx) => {
  const { slug } = await params;
  const input = await readBody(request, sketchRequest);
  if (input.website) return Response.json({ ok: true }, { status: 201 }); // bot filled the honeypot

  const ip = clientKey(request);
  await limit("request", ip, 5, "1 hour");

  // Look the artist up as the visitor so only approved artists can be messaged.
  const { data: a, error } = await (await createClient())
    .from("artists")
    .select("id, display_name, status")
    .eq("slug", slug.toLowerCase())
    .eq("status", "approved")
    .maybeSingle();
  check(error);
  if (!a) throw new HttpError(404, "Artist not found");

  const id = crypto.randomUUID();
  const stored: string[] = [];
  try {
    for (const [i, path] of input.references.entries()) {
      const img = await toWebp(await readIncoming(path, "ref"), 1600);
      const target = `${id}/${i + 1}.webp`;
      await put("references", target, img.data);
      stored.push(target);
    }

    const { error: insertError } = await createAdminClient().from("requests").insert({
      id,
      artist_id: a.id,
      idea: input.idea,
      placement: input.placement ?? null,
      size: input.size ?? null,
      body_zone: input.body_zone ?? null,
      size_cm: input.size_cm ?? null,
      pos_x: input.position?.x ?? null,
      pos_y: input.position?.y ?? null,
      style: input.style ?? null,
      contact_name: input.contact_name,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      contact_instagram: input.contact_instagram ?? null,
      language: input.language,
      reference_paths: stored,
    });
    check(insertError);
  } catch (e) {
    await remove("references", stored);
    throw e;
  }

  await removeIncoming(input.references);
  after(() =>
    notifyNewRequest({ artistId: a.id, artistName: a.display_name, contactName: input.contact_name, idea: input.idea }),
  );

  return Response.json({ id }, { status: 201 });
});
