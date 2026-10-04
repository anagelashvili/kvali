-- Kvali: artists, their works, style/vibe tags and sketch requests.
-- Reads go through RLS; anything that touches storage paths or moderation
-- (work rows, avatar_path, status, requests) is written by the server with the
-- service role, so artists can only change the columns granted below.

create extension if not exists pg_trgm with schema extensions;

create type artist_status as enum ('pending', 'approved', 'hidden');
create type tag_kind as enum ('style', 'vibe');
create type request_status as enum ('new', 'replied', 'booked', 'declined');
create type tattoo_size as enum ('tiny', 'small', 'medium', 'large', 'xl');

-- ---------------------------------------------------------------- artists

create table artists (
  id           uuid primary key references auth.users on delete cascade,
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  bio_ka       text check (length(bio_ka) <= 1500),
  bio_en       text check (length(bio_en) <= 1500),
  studio       text check (length(studio) <= 100),
  city         text not null default 'Tbilisi' check (length(city) <= 60),
  address      text check (length(address) <= 200),
  instagram    text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  phone        text check (phone ~ '^\+?[0-9 ()-]{6,20}$'),
  price_from   integer check (price_from >= 0),
  price_to     integer check (price_to >= 0),
  languages    text[] not null default '{ka}'
               check (languages <@ array['ka', 'en', 'ru'] and cardinality(languages) >= 1),
  avatar_path  text,
  status       artist_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (price_to is null or price_from is null or price_to >= price_from)
);

create index artists_search_idx on artists
  using gin ((display_name || ' ' || coalesce(studio, '')) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------- tags

create table tags (
  slug    text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind    tag_kind not null,
  name_en text not null,
  name_ka text not null,
  sort    integer not null default 0
);

-- ---------------------------------------------------------------- works

create table works (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artists on delete cascade,
  image_path  text not null,
  thumb_path  text not null,
  width       integer not null check (width > 0),
  height      integer not null check (height > 0),
  caption     text check (length(caption) <= 300),
  position    integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index works_artist_idx on works (artist_id, position);
create index works_feed_idx on works (created_at desc, id desc) where published;

create table work_tags (
  work_id uuid not null references works on delete cascade,
  tag     text not null references tags on update cascade on delete cascade,
  primary key (work_id, tag)
);

create index work_tags_tag_idx on work_tags (tag, work_id);

-- ---------------------------------------------------------------- requests

create table requests (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references artists on delete cascade,
  idea              text not null check (length(btrim(idea)) between 10 and 2000),
  placement         text check (length(placement) <= 60),
  size              tattoo_size,
  contact_name      text not null check (length(btrim(contact_name)) between 1 and 80),
  contact_email     text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(contact_email) <= 200),
  contact_phone     text check (contact_phone ~ '^\+?[0-9 ()-]{6,20}$'),
  contact_instagram text check (contact_instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  language          text not null default 'ka' check (language in ('ka', 'en', 'ru')),
  reference_paths   text[] not null default '{}' check (cardinality(reference_paths) <= 3),
  status            request_status not null default 'new',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (coalesce(contact_email, contact_phone, contact_instagram) is not null)
);

create index requests_inbox_idx on requests (artist_id, created_at desc);

-- ---------------------------------------------------------------- rate limiting

create table rate_events (
  bucket     text not null,
  key        text not null,
  created_at timestamptz not null default now()
);

create index rate_events_idx on rate_events (bucket, key, created_at);

-- Records a hit and returns false when the key is over its limit for the window.
create function hit_rate(p_bucket text, p_key text, p_max integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from rate_events where created_at < now() - interval '1 day';
  select count(*) into n from rate_events
   where bucket = p_bucket and key = p_key and created_at > now() - p_window;
  if n >= p_max then
    return false;
  end if;
  insert into rate_events (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

revoke all on function hit_rate from public, anon, authenticated;

-- ---------------------------------------------------------------- updated_at

create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger artists_touch before update on artists
  for each row execute function touch_updated_at();
create trigger requests_touch before update on requests
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------- privileges

revoke all on artists, works, work_tags, requests, tags, rate_events from anon, authenticated;

grant select on artists, works, work_tags, tags to anon, authenticated;

grant insert (id, slug, display_name, bio_ka, bio_en, studio, city, address, instagram, phone,
              price_from, price_to, languages)
  on artists to authenticated;
grant update (slug, display_name, bio_ka, bio_en, studio, city, address, instagram, phone,
              price_from, price_to, languages)
  on artists to authenticated;

grant update (caption, position, published) on works to authenticated;
grant delete on works to authenticated;
grant insert, delete on work_tags to authenticated;

grant select on requests to authenticated;
grant update (status) on requests to authenticated;

-- ---------------------------------------------------------------- RLS

alter table artists enable row level security;
alter table tags enable row level security;
alter table works enable row level security;
alter table work_tags enable row level security;
alter table requests enable row level security;
alter table rate_events enable row level security;

create policy "approved artists are public" on artists for select
  using (status = 'approved' or id = (select auth.uid()));
create policy "artists create their own profile" on artists for insert to authenticated
  with check (id = (select auth.uid()));
create policy "artists edit their own profile" on artists for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "tags are public" on tags for select using (true);

create policy "published work of approved artists is public" on works for select
  using (
    artist_id = (select auth.uid())
    or (published and exists (select 1 from artists a where a.id = artist_id and a.status = 'approved'))
  );
create policy "artists edit their own work" on works for update to authenticated
  using (artist_id = (select auth.uid())) with check (artist_id = (select auth.uid()));
create policy "artists delete their own work" on works for delete to authenticated
  using (artist_id = (select auth.uid()));

create policy "tags of visible work are public" on work_tags for select
  using (exists (select 1 from works w where w.id = work_id));
create policy "artists tag their own work" on work_tags for insert to authenticated
  with check (exists (select 1 from works w where w.id = work_id and w.artist_id = (select auth.uid())));
create policy "artists untag their own work" on work_tags for delete to authenticated
  using (exists (select 1 from works w where w.id = work_id and w.artist_id = (select auth.uid())));

create policy "artists read their inbox" on requests for select to authenticated
  using (artist_id = (select auth.uid()));
create policy "artists set request status" on requests for update to authenticated
  using (artist_id = (select auth.uid())) with check (artist_id = (select auth.uid()));

-- ---------------------------------------------------------------- search

-- The explore grid. Styles match any of the given styles, vibes any of the
-- given vibes, and both must hold when both are given. Keyset pagination on
-- (created_at, id).
create function explore_works(
  p_styles    text[] default null,
  p_vibes     text[] default null,
  p_q         text default null,
  p_before    timestamptz default null,
  p_before_id uuid default null,
  p_limit     integer default 30
)
returns table (
  id uuid, image_path text, thumb_path text, width integer, height integer, caption text,
  created_at timestamptz, artist_slug text, artist_name text, artist_studio text, tags text[]
)
language sql stable
set search_path = public
as $$
  select w.id, w.image_path, w.thumb_path, w.width, w.height, w.caption, w.created_at,
         a.slug, a.display_name, a.studio,
         coalesce((select array_agg(t.tag order by t.tag) from work_tags t where t.work_id = w.id), '{}')
    from works w
    join artists a on a.id = w.artist_id
   where w.published
     and a.status = 'approved'
     and (coalesce(cardinality(p_styles), 0) = 0
          or exists (select 1 from work_tags t where t.work_id = w.id and t.tag = any (p_styles)))
     and (coalesce(cardinality(p_vibes), 0) = 0
          or exists (select 1 from work_tags t where t.work_id = w.id and t.tag = any (p_vibes)))
     and (coalesce(p_q, '') = ''
          or a.display_name ilike '%' || p_q || '%'
          or a.studio ilike '%' || p_q || '%'
          or w.caption ilike '%' || p_q || '%')
     and (p_before is null or (w.created_at, w.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by w.created_at desc, w.id desc
   limit least(greatest(coalesce(p_limit, 30), 1), 60)
$$;

-- Artist search: name/studio match, optionally only artists with work in the
-- given styles. Returns a few thumbnails for the result card.
create function search_artists(
  p_q      text default null,
  p_styles text[] default null,
  p_limit  integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, display_name text, studio text, city text, avatar_path text,
  price_from integer, price_to integer, languages text[], work_count bigint, preview text[], styles text[]
)
language sql stable
set search_path = public
as $$
  select a.id, a.slug, a.display_name, a.studio, a.city, a.avatar_path, a.price_from, a.price_to, a.languages,
         (select count(*) from works w where w.artist_id = a.id and w.published),
         coalesce((select array_agg(p.thumb_path) from (
                     select w.thumb_path from works w where w.artist_id = a.id and w.published
                      order by w.position, w.created_at desc limit 3) p), '{}'),
         coalesce((select array_agg(distinct t.tag) from work_tags t
                     join works w on w.id = t.work_id
                     join tags g on g.slug = t.tag and g.kind = 'style'
                    where w.artist_id = a.id and w.published), '{}')
    from artists a
   where a.status = 'approved'
     and (coalesce(p_q, '') = ''
          or (a.display_name || ' ' || coalesce(a.studio, '')) ilike '%' || p_q || '%')
     and (coalesce(cardinality(p_styles), 0) = 0
          or exists (select 1 from works w join work_tags t on t.work_id = w.id
                      where w.artist_id = a.id and w.published and t.tag = any (p_styles)))
   order by a.display_name
   limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

grant execute on function explore_works, search_artists to anon, authenticated;

-- ---------------------------------------------------------------- storage

-- works/avatars are public and written only by the server after processing.
-- incoming holds raw uploads (signed upload URLs), references holds visitors'
-- reference images, readable only through signed URLs the server hands out.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('works', 'works', true, 5242880, array['image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/webp']),
  ('references', 'references', false, 5242880, array['image/webp']),
  ('incoming', 'incoming', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
