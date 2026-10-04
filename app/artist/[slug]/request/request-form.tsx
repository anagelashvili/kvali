"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Body3D, FALLBACK_ZONES, pieceSize, useWebGL, type Placement, type Shape } from "@/components/body-3d";
import { uploadFile } from "@/lib/supabase/browser";
import css from "./request.module.css";

type Style = { slug: string; name: string };
type Ref = { id: number; preview: string; path?: string; error?: string };

const SHAPES: { id: Shape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "tall", label: "Tall" },
  { id: "wide", label: "Wide" },
];

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
  artist: { slug: string; name: string; city: string; open: boolean; demo: boolean };
  styles: Style[];
  initialStyle: string | null;
}) {
  const webgl = useWebGL();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [zone, setZone] = useState<string | null>(null); // from the 3D map or the list
  const [cm, setCm] = useState(10);
  const [shape, setShape] = useState<Shape>("square");
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<string | null>(initialStyle);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [name, setName] = useState("");
  const [reach, setReach] = useState("");
  const [honey, setHoney] = useState("");
  const [state, setState] = useState<"brief" | "sending" | "sent" | "demo">("brief");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");

  // free image previews when leaving the page
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const size = pieceSize(cm, shape);
  const uploading = refs.some((r) => !r.path && !r.error);
  const canSend =
    state === "brief" && artist.open && !!zone && idea.trim().length >= 10 && name.trim() && reach.trim() && !uploading;

  function place(p: Placement) {
    setPlacement(p);
    setZone(p.zone);
    // spine pieces are long and narrow
    if (/spine/i.test(p.zone) && shape === "square") {
      setShape("tall");
      if (cm < 18) setCm(24);
    }
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
        placement: zone,
        body_zone: zone,
        size_cm: cm,
        shape,
        point: placement && placement.zone === zone ? placement.point : null,
        contact_name: name,
        ...contactFields(reach),
        language: "en",
        references: refs.flatMap((r) => (r.path ? [r.path] : [])),
        website: honey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState(data.demo ? "demo" : "sent");
      return;
    }
    setState("brief");
    setErrors(data.details ?? {});
    setMessage(data.error ?? "Something went wrong, try again");
  }

  const fieldError = (k: string) => errors[k]?.[0];
  const reachError = fieldError("contact_email") ?? fieldError("contact_phone") ?? fieldError("contact_instagram");
  const done = state === "sent" || state === "demo";

  return (
    <div className={css.page}>
      <section className={css.paper}>
        <p className={css.hint}>
          {done ? "Your spot, saved with the request." : "Drag to turn the body. Tap where you want it, the back works too."}
        </p>
        <div className={css.fig}>
          {webgl && <Body3D placement={placement} sizeCm={cm} shape={shape} disabled={state !== "brief"} onPlace={place} />}
        </div>
        <div className={css.readout}>
          <span>{zone ?? "Tap to place"}</span>
          <span>{zone ? `${Math.round(size.w)} × ${Math.round(size.h)} cm` : ""}</span>
        </div>
        <div className={css.controls}>
          <div className={css.shapes} role="group" aria-label="Shape">
            {SHAPES.map((s) => (
              <button type="button" key={s.id} aria-pressed={shape === s.id} disabled={state !== "brief"} onClick={() => setShape(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <label className={css.size}>
            <span>Size</span>
            <input type="range" min={3} max={45} value={cm} disabled={state !== "brief"} onChange={(e) => setCm(+e.target.value)} aria-label="Size, longest side in cm" />
          </label>
          <label className={css.pick}>
            <span>{webgl === false ? "Where on the body?" : "Or pick a spot"}</span>
            <select
              value={zone && FALLBACK_ZONES.includes(zone) ? zone : ""}
              disabled={state !== "brief"}
              onChange={(e) => {
                setZone(e.target.value || null);
                setPlacement(null);
              }}
            >
              <option value="">Choose…</option>
              {FALLBACK_ZONES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={css.form}>
        {done ? (
          <div>
            <h1>
              {state === "demo" ? "That's the flow" : "Sent to"}
              <br />
              {state === "demo" ? "" : artist.name}
            </h1>
            <p className={css.to}>
              {state === "demo"
                ? `${artist.name} is a demo artist, so nothing was sent. With a real artist, they'd reply with a sketch through the contact you left.`
                : `${artist.name} will reply with a sketch through the contact you left. Nothing is booked until you approve it.`}
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
            {artist.demo && <p className={css.note}>Demo artist: try the form, nothing will be sent.</p>}
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
            {!zone && <p className={css.note}>Place it on the body first.</p>}
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
