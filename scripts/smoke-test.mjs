// End-to-end check of the API against local Supabase.
//   npx supabase start && npm run dev
//   node --env-file=.env.local scripts/smoke-test.mjs
// Creates throwaway artists with random emails; safe to run repeatedly.
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

let failures = 0;
const ok = (cond, label, extra) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && extra !== undefined ? `  → ${JSON.stringify(extra)}` : ""}`);
  if (!cond) failures++;
};

/** Minimal cookie-keeping client for one browser session. */
function session(ip) {
  const jar = new Map();
  return async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "x-forwarded-for": ip,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const v = pair.slice(i + 1);
      if (v) jar.set(pair.slice(0, i), v);
      else jar.delete(pair.slice(0, i));
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  };
}

async function codeFor(email) {
  for (let i = 0; i < 30; i++) {
    const list = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) => r.json());
    const msg = list.messages?.[0];
    if (msg) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then((r) => r.json());
      const html = full.HTML ?? "";
      return { code: html.match(/<strong>(\d{6})<\/strong>/)?.[1], link: html.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&") };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`no email for ${email}`);
}

async function signIn(call, email) {
  const r = await call("POST", "/api/auth/login", { email });
  ok(r.status === 200, `login email sent (${email})`, r.body);
  const { code } = await codeFor(email);
  const v = await call("POST", "/api/auth/verify", { email, code });
  ok(v.status === 200, "verify code signs in", v.body);
}

/** A JPEG carrying EXIF GPS data, so we can check it gets stripped. */
async function jpeg(w, h, color) {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .withExif({ IFD0: { Artist: "secret-camera-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 43/1 0/1" } })
    .jpeg()
    .toBuffer();
}

async function upload(call, kind, buffer, type = "image/jpeg") {
  const t = await call("POST", "/api/uploads", { kind });
  if (t.status !== 201) return { ticket: t };
  const storage = createClient(SB, PUB).storage.from("incoming");
  const { error } = await storage.uploadToSignedUrl(t.body.path, t.body.token, new Blob([buffer], { type }), { contentType: type });
  return { ticket: t, path: t.body.path, error };
}

const admin = createClient(SB, SECRET, { auth: { persistSession: false } });
const run = Date.now().toString(36);

// ------------------------------------------------------------ artist sign-up
const ana = session("10.0.0.1");
const anaEmail = `ana-${run}@example.com`;
await signIn(ana, anaEmail);

let r = await ana("GET", "/api/me");
ok(r.status === 200 && r.body.artist === null, "new user has no artist profile yet", r.body);

r = await ana("POST", "/api/me", { display_name: "ანა გელაშვილი" });
ok(r.status === 201, "create profile", r.body);
const slug = r.body.artist?.slug;
ok(/^ana-gelashvili(-\d+)?$/.test(slug ?? ""), `Georgian name becomes slug (${slug})`);
ok(r.body.artist?.status === "pending", "new profile is pending");

r = await ana("POST", "/api/me", { display_name: "Again" });
ok(r.status === 409, "second profile is rejected", r.body);

r = await ana("PATCH", "/api/me", {
  instagram: "https://www.instagram.com/ana.ink/",
  studio: "Black Lamb Studio",
  price_from: 150,
  price_to: 900,
  languages: ["ka", "en", "en"],
  bio_en: "Fine line and botanicals.",
});
ok(r.status === 200 && r.body.artist.instagram === "ana.ink", "profile update normalizes Instagram URL", r.body);
ok(JSON.stringify(r.body.artist?.languages) === '["ka","en"]', "languages deduped");

r = await ana("PATCH", "/api/me", { price_from: 1000 });
ok(r.status === 422, "price_from above price_to is rejected", r.body);

r = await ana("PATCH", "/api/me", { status: "approved" });
const self = await ana("GET", "/api/me");
ok(self.body.artist.status === "pending", "artist cannot approve themselves through the API");

// direct PostgREST write with the artist's own token must not touch status
{
  const { data: s } = await admin.auth.admin.listUsers();
  const user = s.users.find((u) => u.email === anaEmail);
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: anaEmail });
  const direct = createClient(SB, PUB, { auth: { persistSession: false } });
  await direct.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  const { error } = await direct.from("artists").update({ status: "approved" }).eq("id", user.id);
  ok(error?.code === "42501", "direct DB update of status is denied", error);
  const { error: e2 } = await direct.from("works").insert({ artist_id: user.id, image_path: "x", thumb_path: "x", width: 1, height: 1 });
  ok(!!e2, "direct DB insert of a work is denied", e2);
}

// ------------------------------------------------------------ uploads
const a1 = await upload(ana, "work", await jpeg(3000, 2000, "#802020"));
ok(!a1.error && a1.path?.startsWith("art/"), "upload ticket + direct upload", a1.error ?? a1.ticket.body);
r = await ana("POST", "/api/me/works", { path: a1.path, caption: "Botanical sleeve", tags: ["fine-line", "floral"] });
ok(r.status === 201, "create work", r.body);
const w1 = r.body.work;
ok(w1?.width === 2000 && w1?.height === 1333, `image resized to fit 2000px (${w1?.width}x${w1?.height})`);
ok(JSON.stringify(w1?.tags) === '["fine-line","floral"]', "tags stored");

const full = Buffer.from(await fetch(w1.image).then((x) => x.arrayBuffer()));
const meta = await sharp(full).metadata();
ok(meta.format === "webp" && !meta.exif, "stored image is WebP with EXIF/GPS stripped", { format: meta.format, exif: !!meta.exif });
const thumbMeta = await sharp(Buffer.from(await fetch(w1.thumb).then((x) => x.arrayBuffer()))).metadata();
ok(thumbMeta.width === 640, "thumbnail is 640px wide");

const a2 = await upload(ana, "work", await jpeg(800, 1200, "#203080"));
r = await ana("POST", "/api/me/works", { path: a2.path, caption: "Kyoto koi", tags: ["japanese", "traveler", "animals"] });
ok(r.status === 201, "create second work", r.body);
const w2 = r.body.work;

r = await ana("POST", "/api/me/works", { path: a2.path, tags: [] });
ok(r.status === 422, "raw upload can't be reused", r.body);

const a3 = await upload(ana, "work", await jpeg(400, 400, "#000"));
r = await ana("POST", "/api/me/works", { path: a3.path, tags: ["not-a-tag"] });
ok(r.status === 422, "unknown tag rejected", r.body);

const bad = await upload(ana, "work", Buffer.from("definitely not an image"), "image/png");
r = await ana("POST", "/api/me/works", { path: bad.path });
ok(r.status === 422, "non-image upload rejected", r.body);

r = await ana("GET", "/api/me/works");
ok(r.body.works?.length === 2 && r.body.works[0].id === w2.id, "own works listed, newest first", r.body);

// ------------------------------------------------------------ visibility
r = await fetch(`${BASE}/api/artists/${slug}`);
ok(r.status === 404, "pending artist hidden from public");

await admin.from("artists").update({ status: "approved" }).eq("slug", slug);

r = await (await fetch(`${BASE}/api/artists/${slug}`)).json();
ok(r.artist?.name === "ანა გელაშვილი" && r.works.length === 2, "approved artist is public with works", r);
ok(r.artist && !("status" in r.artist), "public profile hides status");

const explore = async (qs) => (await fetch(`${BASE}/api/works?${qs}`)).json();
r = await explore(`q=${encodeURIComponent("Black Lamb")}`);
ok(r.works?.length === 2, "explore: search by studio", r);
r = await explore(`style=fine-line&q=${encodeURIComponent("Black Lamb")}`);
ok(r.works?.length === 1 && r.works[0].id === w1.id, "explore: style filter", r);
r = await explore(`style=fine-line,japanese&vibe=traveler&q=${encodeURIComponent("Black Lamb")}`);
ok(r.works?.length === 1 && r.works[0].id === w2.id, "explore: style OR + vibe AND", r);
r = await explore(`q=${encodeURIComponent("Black Lamb")}&limit=1`);
const page2 = await explore(`q=${encodeURIComponent("Black Lamb")}&limit=1&cursor=${r.next}`);
ok(r.works?.length === 1 && page2.works?.length === 1 && page2.works[0].id !== r.works[0].id, "explore: cursor pagination", { r, page2 });
r = await explore("q=%25");
ok(Array.isArray(r.works) && r.works.every((w) => w.caption?.includes("%") || w.artist.name.includes("%") || w.artist.studio?.includes("%")), "explore: % is literal, not a wildcard", r);
r = await fetch(`${BASE}/api/works?cursor=garbage`);
ok(r.status === 422, "explore: bad cursor → 422");

r = await (await fetch(`${BASE}/api/artists?q=${encodeURIComponent("გელაშვილი")}`)).json();
ok(r.artists?.some((x) => x.slug === slug && x.work_count === 2 && x.preview.length === 2), "artist search in Georgian", r);
r = await (await fetch(`${BASE}/api/artists?style=japanese&q=${encodeURIComponent("Black Lamb")}`)).json();
ok(r.artists?.length === 1 && r.artists[0].styles.includes("japanese"), "artist search by style", r);

// ------------------------------------------------------------ editing work
r = await ana("PATCH", `/api/me/works/${w1.id}`, { tags: ["fine-line", "nature"], caption: "" });
ok(r.status === 200 && JSON.stringify(r.body.work.tags) === '["fine-line","nature"]' && r.body.work.caption === null, "edit tags and clear caption", r.body);
r = await ana("PUT", "/api/me/works/order", { ids: [w1.id, w2.id] });
ok(r.status === 204, "reorder", r.body);
r = await (await fetch(`${BASE}/api/artists/${slug}`)).json();
ok(r.works?.[0]?.id === w1.id, "public portfolio follows new order");
r = await ana("PUT", "/api/me/works/order", { ids: [w1.id] });
ok(r.status === 422, "reorder must include every work");
r = await ana("PATCH", `/api/me/works/${w2.id}`, { published: false });
r = await explore(`q=${encodeURIComponent("Black Lamb")}`);
ok(r.works?.length === 1, "unpublished work leaves explore");

// ------------------------------------------------------------ another artist can't touch Ana's things
const nino = session("10.0.0.2");
await signIn(nino, `nino-${run}@example.com`);
r = await nino("POST", "/api/me/works", { path: a1.path });
ok(r.status === 409, "user without profile can't add work", r.body);
await nino("POST", "/api/me", { display_name: "Nino" });
r = await nino("PATCH", `/api/me/works/${w1.id}`, { caption: "hacked" });
ok(r.status === 404, "can't edit another artist's work", r.body);
r = await nino("DELETE", `/api/me/works/${w1.id}`);
ok(r.status === 404, "can't delete another artist's work", r.body);
const forged = { path: a3.path };
r = await nino("POST", "/api/me/works", forged);
ok(r.status === 422, "can't claim another artist's upload", r.body);

// ------------------------------------------------------------ sketch request from a visitor
const visitor = session("10.0.0.9");
const ref = await upload(visitor, "reference", await jpeg(2400, 2400, "#aaa"));
ok(!ref.error && ref.path?.startsWith("ref/"), "anonymous reference upload", ref.error ?? ref.ticket.body);
r = await visitor("POST", "/api/uploads", { kind: "work" });
ok(r.status === 401, "anonymous user can't get a work upload ticket");

r = await visitor("POST", `/api/artists/${slug}/requests`, { idea: "small", contact_name: "Giorgi" });
ok(r.status === 422 && r.body.details?.idea && r.body.details?.contact_email, "request needs real idea + contact", r.body);

r = await visitor("POST", `/api/artists/${slug}/requests`, {
  idea: "A small mountain line on my forearm, Kazbegi at sunrise.",
  placement: "forearm",
  size: "small",
  contact_name: "Giorgi",
  contact_instagram: "@giorgi.travels",
  language: "en",
  references: [ref.path],
});
ok(r.status === 201 && r.body.id, "sketch request created", r.body);
const reqId = r.body.id;

r = await visitor("POST", `/api/artists/${(await nino("GET", "/api/me")).body.artist.slug}/requests`, {
  idea: "Please draw me something nice", contact_name: "X", contact_email: "x@example.com",
});
ok(r.status === 404, "can't message a pending artist", r.body);

r = await visitor("POST", `/api/artists/${slug}/requests`, {
  idea: "Buy cheap followers now!!!", contact_name: "bot", contact_email: "bot@example.com", website: "spam",
});
ok(r.status === 422 || r.status === 201, "honeypot doesn't error for bots");

// ------------------------------------------------------------ inbox
r = await ana("GET", "/api/me/requests");
ok(r.body.requests?.length === 1 && r.body.counts?.new === 1 && r.body.requests[0].reference_count === 1, "request in artist inbox", r.body);
r = await ana("GET", `/api/me/requests/${reqId}`);
ok(r.body.request?.contact_instagram === "giorgi.travels" && r.body.request.references.length === 1, "request detail with contact", r.body);
const refImg = await fetch(r.body.request.references[0]);
const refMeta = await sharp(Buffer.from(await refImg.arrayBuffer())).metadata();
ok(refImg.ok && refMeta.width === 1600 && !refMeta.exif, "reference image resized and stripped");
const { data: pub } = await createClient(SB, PUB).storage.from("references").download(`${reqId}/1.webp`);
ok(!pub, "reference images are not publicly readable");

r = await ana("PATCH", `/api/me/requests/${reqId}`, { status: "replied" });
ok(r.status === 200 && r.body.request.status === "replied", "mark replied", r.body);
r = await ana("PATCH", `/api/me/requests/${reqId}`, { status: "maybe" });
ok(r.status === 422, "invalid status rejected");
r = await nino("GET", `/api/me/requests/${reqId}`);
ok(r.status === 404, "other artist can't read the request");
r = await nino("PATCH", `/api/me/requests/${reqId}`, { status: "declined" });
ok(r.status === 404, "other artist can't change the request");
{
  const { data, error } = await createClient(SB, PUB).from("requests").select("*");
  ok(!error ? data.length === 0 : true, "anonymous DB read of requests returns nothing", { data, error });
}

// ------------------------------------------------------------ avatar, delete, logout
const av = await upload(ana, "avatar", await jpeg(1200, 800, "#555"));
r = await ana("POST", "/api/me/avatar", { path: av.path });
ok(r.status === 200 && r.body.artist.avatar, "avatar set", r.body);
const avMeta = await sharp(Buffer.from(await fetch(r.body.artist.avatar).then((x) => x.arrayBuffer()))).metadata();
ok(avMeta.width === 400 && avMeta.height === 400, "avatar cropped to 400×400");

r = await ana("DELETE", `/api/me/works/${w2.id}`);
ok(r.status === 204, "delete work");
ok((await fetch(w2.image)).status >= 400, "deleted work's file is gone from storage");

r = await ana("POST", "/api/auth/logout");
r = await ana("GET", "/api/me");
ok(r.status === 401, "signed out");

// ------------------------------------------------------------ rate limit
const spammer = session("10.0.0.66");
let last;
for (let i = 0; i < 9; i++) last = await spammer("POST", "/api/auth/login", { email: `spam${i}-${run}@example.com` });
ok(last.status === 429, "login is rate limited per IP", last.body);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
