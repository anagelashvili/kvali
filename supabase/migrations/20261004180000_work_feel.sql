-- "Describe the feeling" sliders on the wall. Each is 0–100 between two poles;
-- null means the artist hasn't set it and the wall treats it as the middle.
alter table works
  add column feel_weight smallint check (feel_weight between 0 and 100), -- delicate → aggressive
  add column feel_detail smallint check (feel_detail between 0 and 100), -- minimal → ornate
  add column feel_color  smallint check (feel_color between 0 and 100),  -- black ink → color
  add column feel_scale  smallint check (feel_scale between 0 and 100);  -- small → huge

grant update (feel_weight, feel_detail, feel_color, feel_scale) on works to authenticated;

drop function explore_works(text[], text[], text, timestamptz, uuid, integer);

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
  created_at timestamptz, artist_slug text, artist_name text, artist_studio text, tags text[],
  feel_weight smallint, feel_detail smallint, feel_color smallint, feel_scale smallint
)
language sql stable
set search_path = public
as $$
  select w.id, w.image_path, w.thumb_path, w.width, w.height, w.caption, w.created_at,
         a.slug, a.display_name, a.studio,
         coalesce((select array_agg(t.tag order by t.tag) from work_tags t where t.work_id = w.id), '{}'),
         w.feel_weight, w.feel_detail, w.feel_color, w.feel_scale
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
   limit least(greatest(coalesce(p_limit, 30), 1), 120)
$$;

grant execute on function explore_works to anon, authenticated;
