# Kvali

Tbilisi's tattoo artists, by style. Next.js on Vercel with Supabase (Postgres, auth, storage).

- `public/landing.html`: the landing prototype, served at `/`
- `app/explore`: the wall · `app/artist/[slug]`: artist booth · `app/artist/[slug]/request`: request with body map
- `app/api/`: the backend; see [docs/API.md](docs/API.md)
- `design/`: the approved HTML prototypes the pages are built from
- `supabase/migrations/`: database schema, permissions and search functions
- `supabase/seed.sql`: style and vibe tags
- `HANDOFF.md`: product and design decisions

## Run locally

Needs Node 22+ (on Node 20, prefix commands with `NODE_OPTIONS=--experimental-websocket`) and Docker.

```sh
npm install
npx supabase start            # local Postgres, auth, storage; emails go to http://127.0.0.1:54324
cp .env.example .env.local    # fill in from `npx supabase status`
npm run dev                   # http://localhost:3000
npm run smoke                 # end-to-end API check against the local stack
node --env-file=.env.local scripts/seed-demo.mjs   # local demo artists so the wall has something to show
```

Supabase Studio (browse tables, approve artists): http://127.0.0.1:54323

After changing the schema, add a migration in `supabase/migrations/`, run `npx supabase db reset`,
then `npm run db:types`.
