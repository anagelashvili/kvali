import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { encodeCursor, likeSafe, work } from "@/lib/present";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ExploreParams = {
  style?: string[];
  vibe?: string[];
  q?: string;
  cursor?: { before: string; id: string } | null;
  limit: number;
};

/** One page of the explore grid; shared by /api/works and the /explore page. */
export async function exploreWorks(supabase: Supabase, p: ExploreParams) {
  const { data, error } = await supabase.rpc("explore_works", {
    p_styles: p.style,
    p_vibes: p.vibe,
    p_q: likeSafe(p.q),
    p_before: p.cursor?.before,
    p_before_id: p.cursor?.id,
    p_limit: p.limit,
  });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const last = rows.at(-1);
  return {
    works: rows.map((r) => ({
      ...work(r),
      artist: { slug: r.artist_slug, name: r.artist_name, studio: r.artist_studio, demo: r.artist_is_demo },
    })),
    next: rows.length === p.limit && last ? encodeCursor(last.created_at, last.id) : null,
  };
}

export type ExploreWork = Awaited<ReturnType<typeof exploreWorks>>["works"][number];
