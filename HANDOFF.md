# Tbilisi Tattoo Gallery (Kvali): handoff notes

## What this is
A site where tattoo artists upload portfolios and visitors browse them by style and vibe (e.g. "traveler"). Flow: browse, filter, open an artist, send a short brief, artist replies with a sketch, visitor books. Launch focus: Tbilisi / Georgia. Languages: Georgian + English at minimum (Russian is common too). Business model undecided: leaning toward a small cut of booking deposits, with paid featured placement later.

## Design prototypes
Three self-contained prototype pages in `design/` (vanilla HTML/CSS/JS, Google Fonts only). They are design references, not the app. Shared look: ink (#0E0E0E) + bone (#EDE8DC), Syne + Archivo, hard edges, grain overlay, tattoo-pen cursor with fading ink trail, all placeholder art generated in SVG.

1. `public/landing.html` (served at `/`): landing page.
2. `design/the-wall.html`: the gallery page, "the flash wall". Built as `/explore`.
3. `design/request-form.html`: the request-a-sketch page with a body map.

Landing sequence: white screen -> black dragon flies across and wipes it away -> hero -> statement (words light up on scroll) -> 7 style sections (Fine line, Old school, Blackwork, Japanese, Realism, Dotwork, Watercolor) separated by short "Next: ..." pauses -> how it works (3 steps) -> "Are you an artist?" -> pick-your-style chips + Explore button.

## Design decisions (all approved by the owner)
- Strictly monochrome: ink black (#0E0E0E) and bone (#EDE8DC); background flips between them per section.
- Fonts: Syne (headlines, weight 800) + Archivo (body). Blackletter was tried and rejected as unreadable; Bodoni and Anton were rejected as too plain.
- Cursor is a tattoo machine that leaves a fading ink trail (desktop only). Ink, pen and dragon use mix-blend-mode: difference so they read on white, ink and bone.
- A Japanese-style dragon follows the scroll down the page. It fades out during artwork sections so it never covers the tattoos, and returns in the pauses. Dragon path is a generated polyline; head is a hand-drawn SVG (weakest part visually, a real illustration would be better).
- Each style section uses a different scroll mechanic so it doesn't get repetitive: drift, horizontal slide, zoom-through, card stack, pen spotlight. Effects finish at ~85% of the section and hold.
- Frames currently hold generated abstract ink-wash placeholders (SVG feTurbulence). Replace with real artist photos, with the artists' permission. Do not use scraped Pinterest images.

## Known gotchas
- Don't put mix-blend-mode on a page-tall element; the dragon layer is position: fixed and viewport-sized, with the path translated by -scrollY. A page-tall blended layer failed to render and left the intro stuck on white.
- Intro has a 6.5s failsafe so the white veil can never get stuck.
- Reduced motion is respected for the intro and needle animations; verify the rest.
- Not yet tested on real phones. Touch fallbacks exist (spotlight mask off, pen hidden) but need checking.

## Next steps
1. Real gallery/filter page: masonry grid of work, filter chips (style + vibe), artist portfolio page.
2. Data model: artists, works, tags (style, subject, vibe), requests/briefs, bookings.
3. Sketch-request form (idea, placement, size, references) instead of a blank chat; notify artists via the channel they already use (Instagram/WhatsApp/email).
4. Georgian + English i18n from the start.
5. Onboard ~20-30 Tbilisi artists personally (import from Instagram with approval).
6. Deposits: check which payment gateway works for Georgian merchants (verify, don't assume); launch with manual booking if needed.
7. Performance pass on mobile for the landing animations.

## Gallery page: "the flash wall"
- Pieces are pinned like flash sheets on a dark wall: slightly rotated, taped at the top, with clear gaps between them (the owner asked for space; overlap was removed). Hover lifts a piece.
- Filters: style chips + four vibe sliders (delicate/aggressive, minimal/ornate, black ink/color, small/huge). Only touched sliders count. Pieces below a match threshold fade to grey ghosts instead of disappearing; the rest re-sort by score. In the real app this means each work needs style + a 4-value vibe vector (artist-tagged or derived).
- Tapping a piece opens the artist "booth": huge cropped name, their works, a sticky "Request a sketch" tab. Meant to be a real route in the app.
- Not built yet: "more like this" reshuffle, grease-pencil moodboard, the dragon as page transition.

## Request page: body map
- Left: a line-drawn body. Tap/drag to place a dashed box; a slider sets size in cm (2.4 SVG units per cm on a ~170 cm figure); the nearest body zone is named from the wearer's point of view (e.g. "Right forearm"). Zone ellipses are hand-placed approximations; replace with proper anatomy art and add a back view.
- Right: idea text, style chips, reference images (shown as taped polaroids), send button (enabled once a spot and an idea exist).
- After sending, the demo "receives" a sketch and overlays it on the placed box with a reveal slider, then "Approve and book" / "Ask for changes". The sketch is fake; in the app this is the artist's uploaded sketch for that request.
- Data to persist per request: zone, size_cm, position, idea, style, reference images, artist, status (brief / sketch sent / approved / booked).

## Open design questions
- Dragon head is the weakest drawing; get a real illustration.
- Back view and gender-neutral body shape for the body map.

## Backend (2026-10-04)
Next.js 16 + Supabase. Endpoints for explore/search, artist profiles, sketch requests, artist sign-in (email link or 6-digit code, Google once keys exist), profile editing, work uploads with tags and the four vibe values, and the requests inbox. See `docs/API.md`. Pages under `app/login`, `app/join`, `app/dashboard` are bare placeholders until the design arrives. New artists start as `pending`; approve them in Supabase Studio for now.
