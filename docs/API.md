# Kvali API

All endpoints return JSON. Errors look like `{ "error": "message", "details": { "field": ["problem"] } }`
with status 401 (sign in), 404, 409 (conflict), 422 (invalid input) or 429 (rate limited).
Signed-in requests use the Supabase session cookie, which is set by the auth endpoints, so the
browser only needs `fetch(url, { credentials: "same-origin" })`.

Image URLs in responses are ready to use in `<img src>`.

## Visitors

| Method | Path | What it does |
|---|---|---|
| GET | `/api/tags` | `{ styles, vibes }`, each `{ slug, name: { en, ka } }`, for filter chips |
| GET | `/api/works?style=a,b&vibe=c&q=&cursor=&limit=30` | Explore grid, newest first. Styles match any; vibes match any; both must hold when both are given. `q` searches artist name, studio and caption. Returns `{ works, next }`; pass `next` back as `cursor` for the next page. |
| GET | `/api/artists?q=&style=&limit=24&offset=0` | Artist search with 3 preview thumbnails, styles and work count. `{ artists, next_offset }` |
| GET | `/api/artists/:slug` | Artist profile and published portfolio in the artist's order |
| POST | `/api/uploads` `{ kind: "reference" }` | Upload ticket for a reference image (see Uploads) |
| POST | `/api/artists/:slug/requests` | Sketch request (below) |

Sketch request body:

```json
{
  "idea": "A small mountain line on my forearm",   // 10–2000 chars
  "placement": "forearm",                          // optional
  "size": "small",                                 // tiny | small | medium | large | xl, optional
  "body_zone": "Right forearm",                    // from the body map, optional
  "size_cm": 8,                                    // 1–60, optional
  "position": { "x": 43.2, "y": 168.5 },           // point on the 200×420 front-view map, optional
  "style": "fine-line",                            // style tag slug, optional
  "contact_name": "Giorgi",
  "contact_email": "g@example.com",                // at least one of email / phone / instagram
  "contact_phone": "+995 555 12 34 56",
  "contact_instagram": "@giorgi",
  "language": "en",                                // ka | en | ru
  "references": ["ref/…"],                         // up to 3 upload paths
  "website": ""                                    // honeypot: render hidden, leave empty
}
```

Limited to 5 requests per hour per visitor. The artist gets an email (needs `RESEND_API_KEY`).

## Signing in (artists)

| Method | Path | What it does |
|---|---|---|
| POST | `/api/auth/login` `{ email }` | Emails a sign-in link and a 6-digit code. Also registers new users. |
| POST | `/api/auth/verify` `{ email, code }` | Signs in with the code (for in-app browsers where the link opens elsewhere) |
| GET | `/api/auth/google` | Redirects to Google sign-in (once Google keys are configured) |
| GET | `/auth/confirm` | Where the email link and Google return. Redirects to `/join` (no profile yet) or `/dashboard`. |
| POST | `/api/auth/logout` | Signs out |

## Artist dashboard (signed in)

| Method | Path | What it does |
|---|---|---|
| GET | `/api/me` | `{ user, artist }`; `artist` is null until the profile exists |
| POST | `/api/me` `{ display_name, slug?, …profile }` | Creates the artist profile. The slug is generated from the name (Georgian is romanized) if not given. New profiles are `pending` until approved. |
| PATCH | `/api/me` | Update any of: `display_name, slug, bio_ka, bio_en, studio, city, address, instagram, phone, price_from, price_to, languages`. Empty string clears a field. Instagram accepts `@name` or a profile URL. |
| POST | `/api/me/avatar` `{ path }` | Sets the profile picture (cropped to 400×400) |
| DELETE | `/api/me/avatar` | Removes it |
| GET | `/api/me/works` | All own works including unpublished, in portfolio order |
| POST | `/api/me/works` `{ path, caption?, tags?, feel?, published? }` | Adds a work at the front of the portfolio. Up to 8 tag slugs. `feel` is the wall's four sliders, each 0–100 or null: `{ weight, detail, color, scale }` (delicate→aggressive, minimal→ornate, black ink→color, small→huge). |
| PATCH | `/api/me/works/:id` `{ caption?, tags?, feel?, published? }` | `tags` replaces the whole set |
| DELETE | `/api/me/works/:id` | Deletes the work and its files |
| PUT | `/api/me/works/order` `{ ids }` | New portfolio order; must list every work once |
| GET | `/api/me/requests?status=new&limit=50&offset=0` | Inbox, newest first, with `counts` per status |
| GET | `/api/me/requests/:id` | Full request with contact details and reference image links (valid 1 hour) |
| PATCH | `/api/me/requests/:id` `{ status }` | `new`, `replied`, `booked` or `declined` |

## Uploads

Files go straight from the browser to Supabase Storage, so large phone photos aren't limited by
Vercel's request size:

```js
import { createBrowserClient } from "@supabase/ssr";
const supabase = createBrowserClient(SUPABASE_URL, PUBLISHABLE_KEY);

const ticket = await fetch("/api/uploads", { method: "POST", body: JSON.stringify({ kind: "work" }),
  headers: { "Content-Type": "application/json" } }).then(r => r.json());
await supabase.storage.from("incoming").uploadToSignedUrl(ticket.path, ticket.token, file);
await fetch("/api/me/works", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: ticket.path, tags: ["fine-line"] }) });
```

`kind` is `work` or `avatar` (signed in) or `reference` (anyone). Accepted formats are JPEG, PNG,
WebP and AVIF, up to 15 MB. The server re-encodes every image as WebP and strips all metadata,
including GPS location. Works are stored at 2000px with a 640px thumbnail. Reference images are
stored at 1600px and are only visible to the artist.

## Not built yet

- Admin approval screen. For now approve an artist in Supabase Studio: `artists` table → set `status` to `approved`.
- Cleanup of abandoned raw uploads in the `incoming` bucket.
- Bookings and deposits.
