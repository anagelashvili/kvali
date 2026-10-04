import "server-only";
import { publicUrl } from "@/lib/storage";

// Shapes database rows into API responses: storage paths become URLs and
// moderation fields stay internal.

type ArtistRow = {
  id: string; slug: string; display_name: string; bio_ka: string | null; bio_en: string | null;
  studio: string | null; city: string; address: string | null; instagram: string | null; phone: string | null;
  price_from: number | null; price_to: number | null; languages: string[]; avatar_path: string | null;
  status?: string; created_at?: string; updated_at?: string;
};

export function artist(a: ArtistRow, { own = false } = {}) {
  return {
    id: a.id,
    slug: a.slug,
    name: a.display_name,
    bio: { ka: a.bio_ka, en: a.bio_en },
    studio: a.studio,
    city: a.city,
    address: a.address,
    instagram: a.instagram,
    phone: a.phone,
    price: { from: a.price_from, to: a.price_to, currency: "GEL" },
    languages: a.languages,
    avatar: publicUrl("avatars", a.avatar_path),
    ...(own ? { status: a.status, created_at: a.created_at, updated_at: a.updated_at } : {}),
  };
}

type WorkRow = {
  id: string; image_path: string; thumb_path: string; width: number; height: number; caption: string | null;
  position?: number; published?: boolean; created_at: string; work_tags?: { tag: string }[]; tags?: string[];
  feel_weight?: number | null; feel_detail?: number | null; feel_color?: number | null; feel_scale?: number | null;
};

export function work(w: WorkRow, { own = false } = {}) {
  return {
    id: w.id,
    image: publicUrl("works", w.image_path),
    thumb: publicUrl("works", w.thumb_path),
    width: w.width,
    height: w.height,
    caption: w.caption,
    tags: (w.tags ?? w.work_tags?.map((t) => t.tag) ?? []).sort(),
    feel: {
      weight: w.feel_weight ?? null,
      detail: w.feel_detail ?? null,
      color: w.feel_color ?? null,
      scale: w.feel_scale ?? null,
    },
    created_at: w.created_at,
    ...(own ? { position: w.position, published: w.published } : {}),
  };
}

/** Escapes LIKE wildcards in user search text. */
export const likeSafe = (q: string | undefined) => (q ? q.replace(/[\\%_]/g, "\\$&") : undefined);

export const encodeCursor = (createdAt: string, id: string) =>
  Buffer.from(`${createdAt}|${id}`).toString("base64url");

export function decodeCursor(cursor: string | undefined): { before: string; id: string } | null {
  if (!cursor) return null;
  const [before, id] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!before || !id || Number.isNaN(Date.parse(before))) return null;
  return { before, id };
}
