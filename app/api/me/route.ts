import { check, HttpError, readBody, requireArtist, requireUser, route } from "@/lib/http";
import { artist } from "@/lib/present";
import { createProfile, updateProfile } from "@/lib/schemas";
import { slugify } from "@/lib/slug";

// GET /api/me → { user, artist } (artist is null until the profile is created)
export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("artists").select("*").eq("id", user.id).maybeSingle();
  check(error);
  return Response.json({ user: { id: user.id, email: user.email }, artist: data ? artist(data, { own: true }) : null });
});

// POST /api/me { display_name, slug?, ...profile } — finishes artist sign-up.
// New profiles start as "pending" until approved.
export const POST = route(async (request: Request) => {
  const { supabase, user } = await requireUser();
  const input = await readBody(request, createProfile);

  const base = input.slug ?? slugify(input.display_name);
  if (base.length < 2) throw new HttpError(422, "Choose a profile address", { slug: ["Use Latin letters or numbers"] });

  // When the slug was generated, try base, base-2, base-3… until one is free.
  for (let n = 1; n <= 20; n++) {
    const slug = n === 1 ? base : `${base.slice(0, 36)}-${n}`;
    const { data, error } = await supabase
      .from("artists")
      .insert({ ...input, id: user.id, slug })
      .select("*")
      .single();
    if (!error) return Response.json({ artist: artist(data, { own: true }) }, { status: 201 });
    if (error.code !== "23505") check(error);
    if (error.details?.includes("(id)")) throw new HttpError(409, "Profile already exists");
    if (input.slug) throw new HttpError(409, "That profile address is taken", { slug: ["Taken"] });
  }
  throw new HttpError(409, "Choose a profile address", { slug: ["Taken"] });
});

// PATCH /api/me { ...any profile fields }
export const PATCH = route(async (request: Request) => {
  const { supabase, user } = await requireArtist();
  const input = await readBody(request, updateProfile);
  const { data, error } = await supabase.from("artists").update(input).eq("id", user.id).select("*").single();
  if (error?.code === "23505") throw new HttpError(409, "That profile address is taken", { slug: ["Taken"] });
  check(error);
  return Response.json({ artist: artist(data!, { own: true }) });
});
