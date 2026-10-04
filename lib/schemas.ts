import { z } from "zod";
import { SLUG_RE } from "@/lib/slug";

// Empty strings from forms mean "clear this field".
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).nullable());

/** Accepts "@name", "name" or an instagram.com URL and keeps just the handle. */
const instagram = z.preprocess(
  (v) => {
    const b = blank(v);
    if (typeof b !== "string") return b;
    return b
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/[/?#].*$/, "");
  },
  z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Not a valid Instagram handle").nullable(),
);

const phone = z.preprocess(blank, z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, "Not a valid phone number").nullable());
const price = z.preprocess(blank, z.coerce.number().int().min(0).max(100000).nullable());

export const LANGUAGES = ["ka", "en", "ru"] as const;

const profileShape = {
  slug: z.string().trim().toLowerCase().min(2).max(40).regex(SLUG_RE, "Use lowercase letters, numbers and dashes"),
  display_name: z.string().trim().min(1).max(80),
  bio_ka: text(1500),
  bio_en: text(1500),
  studio: text(100),
  city: z.string().trim().min(1).max(60),
  address: text(200),
  instagram,
  phone,
  price_from: price,
  price_to: price,
  languages: z.array(z.enum(LANGUAGES)).min(1).transform((l) => [...new Set(l)]),
};

const priceOrder = (p: { price_from?: number | null; price_to?: number | null }) =>
  p.price_from == null || p.price_to == null || p.price_to >= p.price_from;

export const createProfile = z
  .object({ ...profileShape, slug: profileShape.slug.optional() })
  .partial({ bio_ka: true, bio_en: true, studio: true, city: true, address: true, instagram: true, phone: true, price_from: true, price_to: true, languages: true })
  .refine(priceOrder, { message: "Highest price must be at least the lowest", path: ["price_to"] });

export const updateProfile = z
  .object(profileShape)
  .partial()
  .refine(priceOrder, { message: "Highest price must be at least the lowest", path: ["price_to"] });

export const uploadTicket = z.object({ kind: z.enum(["work", "avatar", "reference"]) });

const tagList = z
  .array(z.string().trim().toLowerCase().regex(SLUG_RE))
  .max(8)
  .transform((t) => [...new Set(t)]);

// The wall's sliders, 0–100 between two poles; null = not set.
const pole = z.number().int().min(0).max(100).nullable();
export const feel = z
  .object({ weight: pole, detail: pole, color: pole, scale: pole })
  .partial()
  .transform((f) =>
    Object.fromEntries(Object.entries(f).map(([k, v]) => [`feel_${k}`, v])) as Partial<
      Record<"feel_weight" | "feel_detail" | "feel_color" | "feel_scale", number | null>
    >,
  );

export const createWork = z.object({
  path: z.string(),
  caption: text(300).optional(),
  tags: tagList.default([]),
  feel: feel.optional(),
  published: z.boolean().default(true),
});

export const updateWork = z
  .object({ caption: text(300), tags: tagList, feel, published: z.boolean() })
  .partial();

export const reorderWorks = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

export const avatar = z.object({ path: z.string() });

export const SIZES = ["tiny", "small", "medium", "large", "xl"] as const;
export const REQUEST_STATUSES = ["new", "replied", "booked", "declined"] as const;

export const sketchRequest = z
  .object({
    idea: z.string().trim().min(10, "Tell the artist a bit more").max(2000),
    placement: text(60).optional(),
    size: z.enum(SIZES).nullish(),
    // body map: zone name as shown to the visitor, size in cm, point on the front view
    body_zone: text(40).optional(),
    size_cm: z.number().int().min(1).max(60).nullish(),
    position: z.object({ x: z.number().min(0).max(200), y: z.number().min(0).max(420) }).nullish(),
    style: z.string().trim().toLowerCase().regex(SLUG_RE).nullish(),
    // 3D body map: tapped point and surface normal in model space (figure is 1.7 m tall, facing +z)
    point: z
      .object({ x: z.number(), y: z.number(), z: z.number(), nx: z.number(), ny: z.number(), nz: z.number() })
      .refine((p) => Object.values(p).every((v) => Math.abs(v) <= 2), "Point is off the body")
      .nullish(),
    shape: z.enum(["square", "tall", "wide"]).nullish(),
    contact_name: z.string().trim().min(1).max(80),
    contact_email: z.preprocess(blank, z.email().max(200).nullable()).optional(),
    contact_phone: phone.optional(),
    contact_instagram: instagram.optional(),
    language: z.enum(LANGUAGES).default("ka"),
    references: z.array(z.string()).max(3).default([]).transform((r) => [...new Set(r)]),
    // honeypot: real visitors never see or fill this field
    website: z.string().max(0).optional(),
  })
  .refine((r) => r.contact_email || r.contact_phone || r.contact_instagram, {
    message: "Leave at least one way to reach you",
    path: ["contact_email"],
  });

export const requestStatus = z.object({ status: z.enum(REQUEST_STATUSES) });

export const loginEmail = z.object({
  email: z.email().max(200),
});

export const verifyCode = z.object({
  email: z.email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const csv = z
  .string()
  .optional()
  .transform((s) => (s ? s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20) : []));

export const exploreQuery = z.object({
  style: csv,
  vibe: csv,
  q: z.string().trim().max(80).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(120).default(30),
});

export const artistQuery = z.object({
  q: z.string().trim().max(80).optional(),
  style: csv,
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
