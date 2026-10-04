# Tbilisi Tattoo Gallery: handoff notes

## What this is
A site where tattoo artists upload portfolios and visitors browse them by style and vibe (e.g. "traveler"). Flow: browse, filter, open an artist, send a short brief, artist replies with a sketch, visitor books. Launch focus: Tbilisi / Georgia. Languages: Georgian + English at minimum (Russian is common too). Business model undecided: leaning toward a small cut of booking deposits, with paid featured placement later.

## What exists
`tbilisi-tattoo-gallery.html` is a single self-contained landing page (vanilla HTML/CSS/JS, no build step, Google Fonts only). It is a prototype of the opening experience, not the app.

Sequence: white screen -> black dragon flies across and wipes it away -> hero -> statement (words light up on scroll) -> 7 style sections (Fine line, Old school, Blackwork, Japanese, Realism, Dotwork, Watercolor) separated by short "Next: ..." pauses -> how it works (3 steps) -> "Are you an artist?" -> pick-your-style chips + Explore button (placeholder).

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
