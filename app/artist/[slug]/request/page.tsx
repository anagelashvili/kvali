import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InkCursor } from "@/components/ink-cursor";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./request-form";

export async function generateMetadata({ params }: PageProps<"/artist/[slug]/request">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Request a sketch · ${slug} · Kvali` };
}

export default async function RequestPage({ params }: PageProps<"/artist/[slug]/request">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, display_name, city, status")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (!artist) notFound();

  const [{ data: tags }, { data: workTags }] = await Promise.all([
    supabase.from("tags").select("slug, name_en").eq("kind", "style").order("sort"),
    supabase.from("works").select("work_tags(tag)").eq("artist_id", artist.id).eq("published", true),
  ]);
  const styles = (tags ?? []).map((t) => ({ slug: t.slug, name: t.name_en }));

  // Preselect the style this artist tags most.
  const counts = new Map<string, number>();
  for (const w of workTags ?? []) for (const t of w.work_tags) counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
  const main = styles.map((s) => s.slug).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];

  return (
    <>
      <InkCursor />
      <RequestForm
        artist={{ slug: artist.slug, name: artist.display_name, city: artist.city, open: artist.status === "approved" }}
        styles={styles}
        initialStyle={counts.size ? main : null}
      />
    </>
  );
}
