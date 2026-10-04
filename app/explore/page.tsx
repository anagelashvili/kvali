import type { Metadata } from "next";
import { InkCursor } from "@/components/ink-cursor";
import { exploreWorks } from "@/lib/explore";
import { createClient } from "@/lib/supabase/server";
import { Wall } from "./wall";

export const metadata: Metadata = {
  title: "The wall · Kvali",
  description: "Browse Tbilisi tattoo work by style and feeling.",
};

// The wall loads up to 120 pieces up front and filters them in the browser,
// so the chips and sliders respond instantly; more load as you scroll.
// ?style=fine-line,japanese preselects chips (the landing page links here).
export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const { style } = await searchParams;
  const supabase = await createClient();
  const [{ data: tags }, first] = await Promise.all([
    supabase.from("tags").select("slug, name_en").eq("kind", "style").order("sort"),
    exploreWorks(supabase, { limit: 120 }),
  ]);
  const styles = (tags ?? []).map((t) => ({ slug: t.slug, name: t.name_en }));
  const known = new Set(styles.map((s) => s.slug));

  return (
    <>
      <InkCursor />
      <Wall
        styles={styles}
        initialWorks={first.works}
        initialNext={first.next}
        initialStyles={(typeof style === "string" ? style.split(",") : []).filter((s) => known.has(s))}
      />
    </>
  );
}
