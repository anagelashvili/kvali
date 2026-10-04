import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { InkCursor } from "@/components/ink-cursor";
import { artist as presentArtist, work as presentWork } from "@/lib/present";
import { createClient } from "@/lib/supabase/server";
import css from "./booth.module.css";

const LANG: Record<string, string> = { ka: "Georgian", en: "English", ru: "Russian" };

// RLS hides pending/hidden artists from everyone but themselves.
const load = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: a } = await supabase.from("artists").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  if (!a) return null;
  const [{ data: works }, { data: tags }] = await Promise.all([
    supabase
      .from("works")
      .select("id, image_path, thumb_path, width, height, caption, created_at, work_tags(tag)")
      .eq("artist_id", a.id)
      .eq("published", true)
      .order("position")
      .order("created_at", { ascending: false }),
    supabase.from("tags").select("slug, name_en").eq("kind", "style").order("sort"),
  ]);
  return { artist: presentArtist(a), works: (works ?? []).map((w) => presentWork(w)), styles: tags ?? [] };
});

export async function generateMetadata({ params }: PageProps<"/artist/[slug]">): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "Artist not found · Kvali" };
  return { title: `${data.artist.name} · Kvali`, description: data.artist.bio.en ?? `Tattoo artist in ${data.artist.city}` };
}

/** The artist's "booth": huge cropped name, their work, a sticky request tab. */
export default async function Booth({ params }: PageProps<"/artist/[slug]">) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { artist, works, styles } = data;

  const used = new Set(works.flatMap((w) => w.tags));
  const styleNames = styles.filter((s) => used.has(s.slug)).map((s) => s.name_en);
  const price =
    artist.price.from != null || artist.price.to != null
      ? `${artist.price.from ?? "?"}–${artist.price.to ?? "?"} GEL`
      : null;
  const meta = [styleNames.slice(0, 3).join(", "), artist.studio, artist.city, price].filter(Boolean).join(" · ");
  const label = (tags: string[]) => styles.find((s) => tags.includes(s.slug))?.name_en ?? "";

  return (
    <div className={css.booth}>
      <InkCursor />
      <Link href="/explore" className={css.close}>
        Close ×
      </Link>
      <h1 className={css.name}>{artist.name}</h1>
      <p className={css.meta}>{meta}</p>
      {(artist.bio.en || artist.bio.ka) && <p className={css.bio}>{artist.bio.en ?? artist.bio.ka}</p>}
      <p className={css.links}>
        {artist.languages.map((l) => LANG[l] ?? l).join(", ")}
        {artist.instagram && (
          <>
            {" · "}
            <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer">
              @{artist.instagram}
            </a>
          </>
        )}
      </p>

      <div className={css.works}>
        {works.length === 0 && <p>No work on the wall yet.</p>}
        {works.map((w, i) => (
          <figure key={w.id} className={css.tile} style={{ "--r": `${(i % 3) - 1}deg` } as React.CSSProperties}>
            <div className={css.art}>
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized WebP from storage */}
              <img src={w.image!} alt={w.caption ?? `${label(w.tags)} tattoo by ${artist.name}`} loading={i < 4 ? "eager" : "lazy"} />
            </div>
            <figcaption>
              <b>{w.caption ?? artist.name}</b>
              <span>{label(w.tags)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <Link href={`/artist/${artist.slug}/request`} className={css.req}>
        Request a sketch
      </Link>
    </div>
  );
}
