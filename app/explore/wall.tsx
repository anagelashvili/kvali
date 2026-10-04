"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExploreWork } from "@/lib/explore";
import { SAMPLE_FEEL, sampleArt } from "@/lib/sample-art";
import css from "./wall.module.css";

type Style = { slug: string; name: string };

type Piece = {
  id: string;
  thumb: string | null;
  svg?: string;
  styles: string[];
  feel: (number | null)[]; // 0–1 per slider, null = not set
  artist: { slug: string; name: string; demo?: boolean };
  tilt: string;
};

const SLIDERS = [
  ["Delicate", "Aggressive"],
  ["Minimal", "Ornate"],
  ["Black ink", "Color"],
  ["Small", "Huge"],
] as const;
const FEEL_KEYS = ["weight", "detail", "color", "scale"] as const;
const MATCH = 0.68; // pieces scoring below this fade to ghosts

/** Stable -3°…3° tilt per piece. */
function tiltOf(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 600) / 100 - 3).toFixed(1);
}

function toPiece(w: ExploreWork): Piece {
  return {
    id: w.id,
    thumb: w.thumb,
    styles: w.tags,
    feel: FEEL_KEYS.map((k) => (w.feel[k] == null ? null : w.feel[k]! / 100)),
    artist: { slug: w.artist.slug, name: w.artist.name, demo: w.artist.demo },
    tilt: tiltOf(w.id),
  };
}

const SAMPLE_NAMES = ["Nino K.", "Luka M.", "Tamar B.", "Giorgi D.", "Mariam S.", "Sandro T.", "Elene R.", "Dato G.", "Salome P."];

/** The prototype's generated wall, shown until real work is published. */
function samplePieces(styles: Style[]): Piece[] {
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: Piece[] = [];
  styles
    .filter((st) => SAMPLE_FEEL[st.slug])
    .forEach((st, si) => {
      for (let n = 0; n < 3; n++) {
        const id = out.length;
        out.push({
          id: `sample-${id}`,
          thumb: null,
          svg: sampleArt(si, id),
          styles: [st.slug],
          feel: SAMPLE_FEEL[st.slug].map((x) => Math.max(0, Math.min(1, x + (r() - 0.5) * 0.3))),
          artist: { slug: "", name: SAMPLE_NAMES[(id * 4 + si) % 9] },
          tilt: (r() * 6 - 3).toFixed(1),
        });
      }
    });
  return out;
}

export function Wall({
  styles,
  initialWorks,
  initialNext,
  initialStyles,
}: {
  styles: Style[];
  initialWorks: ExploreWork[];
  initialNext: string | null;
  initialStyles: string[];
}) {
  const [works, setWorks] = useState(initialWorks);
  const [next, setNext] = useState(initialNext);
  const [selected, setSelected] = useState(() => new Set(initialStyles));
  const [vals, setVals] = useState<(number | null)[]>([null, null, null, null]);
  const [toast, setToast] = useState("");
  const more = useRef<HTMLDivElement>(null);

  const sample = works.length === 0;
  const pieces = useMemo(() => (sample ? samplePieces(styles) : works.map(toPiece)), [sample, works, styles]);
  const anyDemo = pieces.some((p) => p.artist.demo);
  const styleName = useMemo(() => new Map(styles.map((s) => [s.slug, s.name])), [styles]);

  // Score every piece: chips decide in/out, touched sliders decide how close.
  const { order, ghost, shown } = useMemo(() => {
    const touched = vals.flatMap((v, i) => (v == null ? [] : [i]));
    const scored = pieces.map((p) => {
      const ok = !selected.size || p.styles.some((s) => selected.has(s));
      const sc = touched.length
        ? touched.reduce((a, i) => a + 1 - Math.abs(vals[i]! - (p.feel[i] ?? 0.5)), 0) / touched.length
        : 1;
      return { id: p.id, sc: ok ? sc : 0, ok: ok && sc >= MATCH };
    });
    const order = new Map([...scored].sort((a, b) => b.sc - a.sc).map((s, i) => [s.id, i]));
    const ghost = new Set(scored.filter((s) => !s.ok).map((s) => s.id));
    return { order, ghost, shown: scored.length - ghost.size };
  }, [pieces, selected, vals]);

  // Load further pages as the end of the wall comes into view.
  useEffect(() => {
    if (!next || !more.current) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const res = await fetch(`/api/works?limit=120&cursor=${encodeURIComponent(next)}`);
      if (!res.ok) return;
      const page = await res.json();
      setWorks((w) => [...w, ...page.works]);
      setNext(page.next);
    }, { rootMargin: "800px" });
    io.observe(more.current);
    return () => io.disconnect();
  }, [next]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = (slug: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(slug)) n.add(slug);
      return n;
    });

  return (
    <>
      <header className={css.header}>
        <Link href="/" className={css.logo}>
          Kvali · Tbilisi tattoo artists
        </Link>
        <h1 className={css.title}>The wall</h1>
        <p>Describe the feeling. The wall rearranges. Tap a piece to meet the artist.</p>
      </header>

      <div className={css.ctrl}>
        <div className={css.chips}>
          {styles.map((s) => (
            <button key={s.slug} aria-pressed={selected.has(s.slug)} onClick={() => toggle(s.slug)}>
              {s.name}
            </button>
          ))}
        </div>
        <div className={css.sliders}>
          {SLIDERS.map(([lo, hi], i) => (
            <label key={lo}>
              <span>
                <i>{lo}</i>
                <i>{hi}</i>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={vals[i] == null ? 50 : Math.round(vals[i]! * 100)}
                aria-label={`${lo} to ${hi}`}
                onChange={(e) => {
                  const v = +e.target.value / 100;
                  setVals((x) => x.map((old, j) => (j === i ? v : old)));
                }}
              />
            </label>
          ))}
        </div>
        <div className={css.count}>
          <span>
            {shown} of {pieces.length} pieces{sample ? " · sample wall until artists join" : anyDemo ? " · includes demo artists while real ones join" : ""}
          </span>
          <button
            className={css.clear}
            onClick={() => {
              setSelected(new Set());
              setVals([null, null, null, null]);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <main className={css.wall}>
        {pieces.map((p, i) => {
          const isGhost = ghost.has(p.id);
          const label = p.styles.map((s) => styleName.get(s)).find(Boolean) ?? "";
          const body = (
            <>
              <div className={css.art}>
                {p.svg ? (
                  <span dangerouslySetInnerHTML={{ __html: p.svg }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- already resized WebP from storage
                  <img src={p.thumb!} alt={`${label} tattoo by ${p.artist.name}`} loading={i < 12 ? "eager" : "lazy"} />
                )}
              </div>
              <figcaption>
                <b>{p.artist.name}</b>
                <span>{label}</span>
              </figcaption>
            </>
          );
          const props = {
            className: `${css.tile} ${isGhost ? css.ghost : ""}`,
            style: { "--r": `${p.tilt}deg`, order: order.get(p.id), zIndex: pieces.length - i } as React.CSSProperties,
            "aria-hidden": isGhost || undefined,
          };
          return p.artist.slug ? (
            <Link key={p.id} href={`/artist/${p.artist.slug}`} tabIndex={isGhost ? -1 : undefined} {...props}>
              <figure style={{ margin: 0 }}>{body}</figure>
            </Link>
          ) : (
            <figure key={p.id} {...props} onClick={() => setToast("Sample piece. Real artists are joining soon.")}>
              {body}
            </figure>
          );
        })}
        <div ref={more} className={css.more} style={{ order: pieces.length }} />
      </main>

      {toast && (
        <div className={css.toast} role="status">
          {toast}
        </div>
      )}
    </>
  );
}
