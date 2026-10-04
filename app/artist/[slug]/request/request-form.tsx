"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "@/lib/supabase/browser";
import css from "./request.module.css";

type Style = { slug: string; name: string };
type Ref = { id: number; preview: string; path?: string; error?: string };

// Body zones on the 200×420 figure, named from the wearer's point of view.
// Hand-placed approximations from the prototype; replace with proper anatomy art.
type Zone = { n: string; cx: number; cy: number; rx: number; ry: number };
const ZONES: Zone[] = [
  ...([
    ["shoulder", 62, 86, 11, 11],
    ["upper arm", 52, 118, 9, 22],
    ["forearm", 43, 168, 8, 24],
    ["thigh", 84, 262, 16, 36],
    ["calf", 77, 342, 11, 34],
    ["ankle", 70, 390, 8, 8],
  ] as const).flatMap(([n, cx, cy, rx, ry]) => [
    { n: `Right ${n}`, cx, cy, rx, ry },
    { n: `Left ${n}`, cx: 200 - cx, cy, rx, ry },
  ]),
  { n: "Neck", cx: 100, cy: 62, rx: 13, ry: 10 },
  { n: "Chest", cx: 100, cy: 100, rx: 26, ry: 20 },
  { n: "Ribs and stomach", cx: 100, cy: 158, rx: 24, ry: 30 },
  { n: "Hip", cx: 100, cy: 206, rx: 24, ry: 10 },
];

const UNITS_PER_CM = 2.4; // on a ~170 cm figure

function nearest(x: number, y: number) {
  let best: Zone | null = null;
  let d = Infinity;
  for (const z of ZONES) {
    const dz = ((x - z.cx) / z.rx) ** 2 + ((y - z.cy) / z.ry) ** 2;
    if (dz < d) {
      d = dz;
      best = z;
    }
  }
  return best!;
}

/** Splits "how to reach you" into the email / phone / Instagram field the API expects. */
function contactFields(v: string) {
  const s = v.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return { contact_email: s };
  if (/^\+?[0-9 ()-]{6,20}$/.test(s)) return { contact_phone: s };
  return { contact_instagram: s };
}

export function RequestForm({
  artist,
  styles,
  initialStyle,
}: {
  artist: { slug: string; name: string; city: string; open: boolean };
  styles: Style[];
  initialStyle: string | null;
}) {
  const fig = useRef<SVGSVGElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [cm, setCm] = useState(10);
  const [dragging, setDragging] = useState(false);
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<string | null>(initialStyle);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [name, setName] = useState("");
  const [reach, setReach] = useState("");
  const [honey, setHoney] = useState("");
  const [state, setState] = useState<"brief" | "sending" | "sent">("brief");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");

  // free image previews when leaving the page
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const zone = pos ? nearest(pos.x, pos.y) : null;
  const w = cm * UNITS_PER_CM;
  const h = w * 1.25;
  const box = pos ? { x: pos.x - w / 2, y: pos.y - h / 2, w, h } : null;
  const uploading = refs.some((r) => !r.path && !r.error);
  const canSend =
    state === "brief" && artist.open && !!pos && idea.trim().length >= 10 && name.trim() && reach.trim() && !uploading;

  function toSvg(e: React.PointerEvent) {
    const svg = fig.current!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: Math.max(0, Math.min(200, q.x)), y: Math.max(0, Math.min(420, q.y)) };
  }

  async function addFiles(files: FileList | null) {
    const room = 3 - refs.length;
    const picked = [...(files ?? [])].slice(0, Math.max(0, room));
    const added = picked.map((f, i) => ({ id: Date.now() + i, preview: URL.createObjectURL(f) }));
    previews.current.push(...added.map((a) => a.preview));
    setRefs((r) => [...r, ...added]);
    await Promise.all(
      picked.map(async (f, i) => {
        const id = added[i].id;
        try {
          const path = await uploadFile("reference", f);
          setRefs((r) => r.map((x) => (x.id === id ? { ...x, path } : x)));
        } catch (err) {
          setRefs((r) => r.map((x) => (x.id === id ? { ...x, error: (err as Error).message } : x)));
        }
      }),
    );
  }

  async function send() {
    if (!canSend || !zone) return;
    setState("sending");
    setErrors({});
    setMessage("");
    const res = await fetch(`/api/artists/${artist.slug}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea,
        style,
        placement: zone.n,
        body_zone: zone.n,
        size_cm: cm,
        position: { x: Math.round(pos!.x * 10) / 10, y: Math.round(pos!.y * 10) / 10 },
        contact_name: name,
        ...contactFields(reach),
        language: "en",
        references: refs.flatMap((r) => (r.path ? [r.path] : [])),
        website: honey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("sent");
      return;
    }
    setState("brief");
    setErrors(data.details ?? {});
    setMessage(data.error ?? "Something went wrong, try again");
  }

  const fieldError = (k: string) => errors[k]?.[0];
  const reachError = fieldError("contact_email") ?? fieldError("contact_phone") ?? fieldError("contact_instagram");

  return (
    <div className={css.page}>
      <section className={css.paper}>
        <p className={css.hint}>
          {state === "sent" ? "Your spot, saved with the request." : "Tap the body where you want it. Drag to move it around."}
        </p>
        <svg
          ref={fig}
          className={css.fig}
          viewBox="0 0 200 420"
          role="img"
          aria-label={zone ? `Body map, ${zone.n}, ${cm} cm` : "Body map"}
          onPointerDown={(e) => {
            if (state !== "brief") return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            setPos(toSvg(e));
          }}
          onPointerMove={(e) => dragging && setPos(toSvg(e))}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <defs>
            <pattern id="hat" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#0E0E0E" strokeWidth="1" />
            </pattern>
            <g id="half">
              <path d="M92 55V72Q70 74 64 90Q62 130 62 160Q64 195 72 216L100 220" />
              <path d="M64 90C50 94 46 108 44 124L34 190Q32 202 40 204Q50 205 53 194L64 135" />
              <path d="M72 216L67 300Q65 335 69 382L65 404Q73 412 83 404L90 372Q96 320 100 285" />
            </g>
          </defs>
          <g className={css.line}>
            <circle cx="100" cy="34" r="22" />
            <use href="#half" />
            <use href="#half" transform="translate(200 0) scale(-1 1)" />
          </g>
          <g className={css.zones}>
            {ZONES.map((z) => (
              <ellipse key={z.n} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} className={zone === z ? css.on : undefined} />
            ))}
          </g>
          {box && (
            <g>
              <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="rgba(14,14,14,.1)" stroke="#0E0E0E" strokeWidth="1.6" strokeDasharray="4 3" />
              <path
                fill="none"
                stroke="#0E0E0E"
                strokeWidth="2.4"
                d={(() => {
                  const c = 5;
                  const { x, y, w, h } = box;
                  return `M${x} ${y + c}V${y}H${x + c}M${x + w - c} ${y}H${x + w}V${y + c}M${x} ${y + h - c}V${y + h}H${x + c}M${x + w - c} ${y + h}H${x + w}V${y + h - c}`;
                })()}
              />
            </g>
          )}
        </svg>
        <div className={css.readout}>
          <span>{zone ? zone.n : "Tap to place"}</span>
          <span>{pos ? `${cm} cm` : ""}</span>
        </div>
        <label className={css.size}>
          <span>Size</span>
          <input type="range" min={3} max={30} value={cm} disabled={state !== "brief"} onChange={(e) => setCm(+e.target.value)} />
        </label>
      </section>

      <section className={css.form}>
        {state === "sent" ? (
          <div>
            <h1>
              Sent to
              <br />
              {artist.name}
            </h1>
            <p className={css.to}>
              {artist.name} will reply with a sketch through the contact you left. Nothing is booked until you approve
              it.
            </p>
            <Link href="/explore" className={css.btn}>
              Back to the wall
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <h1>
              Request
              <br />a sketch
            </h1>
            <p className={css.to}>
              To <b>{artist.name}</b>
              {style ? ` · ${styles.find((s) => s.slug === style)?.name}` : ""} · {artist.city}
            </p>
            {!artist.open && <p className={css.error}>This artist isn&apos;t taking requests yet.</p>}

            <label className={css.f} htmlFor="idea">
              What do you want?
            </label>
            <textarea
              id="idea"
              value={idea}
              maxLength={2000}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="A compass with a swallow, a bit worn, like an old sailor tattoo."
            />
            {fieldError("idea") && <p className={css.error}>{fieldError("idea")}</p>}

            <span className={css.f}>Style</span>
            <div className={css.chips}>
              {styles.map((s) => (
                <button type="button" key={s.slug} aria-pressed={style === s.slug} onClick={() => setStyle(style === s.slug ? null : s.slug)}>
                  {s.name}
                </button>
              ))}
            </div>

            <span className={css.f}>References</span>
            <label className={css.drop}>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={refs.length >= 3} onChange={(e) => addFiles(e.target.files)} />
              {refs.length === 0 && <span>Drop images here or tap to add, up to 3. They&apos;ll be pinned like tracing paper.</span>}
              {refs.map((r, i) => (
                <figure key={r.id} style={{ "--r": `${i % 2 ? 3 : -3}deg` } as React.CSSProperties} className={r.error ? css.failed : !r.path ? css.loading : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={r.preview} alt={`Reference ${i + 1}`} />
                  <button
                    type="button"
                    aria-label={`Remove reference ${i + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setRefs((x) => x.filter((y) => y.id !== r.id));
                    }}
                  >
                    ×
                  </button>
                  {r.error && <figcaption>{r.error}</figcaption>}
                </figure>
              ))}
            </label>

            <label className={css.f} htmlFor="name">
              Your name
            </label>
            <input id="name" className={css.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <label className={css.f} htmlFor="reach">
              How should {artist.name} reach you?
            </label>
            <input id="reach" className={css.input} value={reach} maxLength={200} onChange={(e) => setReach(e.target.value)} placeholder="Instagram, phone or email" />
            {reachError && <p className={css.error}>{reachError}</p>}

            {/* honeypot: hidden from people, bots fill it */}
            <input className={css.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" value={honey} onChange={(e) => setHoney(e.target.value)} name="website" />

            <button className={css.go} disabled={!canSend}>
              {state === "sending" ? "Sending…" : uploading ? "Uploading images…" : `Send to ${artist.name}`}
            </button>
            {!pos && <p className={css.note}>Place it on the body first.</p>}
            {message && (
              <p className={css.error} role="alert">
                {message}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
