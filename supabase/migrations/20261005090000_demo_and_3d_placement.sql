-- Demo artists: shown on the site so visitors can try the whole flow, clearly
-- labelled, and requests to them are never stored. Only the service role sets it.
alter table artists add column is_demo boolean not null default false;

-- 3D body map: the tapped point and surface normal in model space (metres, the
-- figure is 1.7 tall, facing +z), plus the piece's proportions.
alter table requests
  add column point jsonb check (
    point is null or (
      jsonb_typeof(point) = 'object'
      and (point ->> 'x')::real between -2 and 2 and (point ->> 'y')::real between -2 and 2
      and (point ->> 'z')::real between -2 and 2
    )
  ),
  add column shape text check (shape in ('square', 'tall', 'wide'));

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
  feel_weight smallint, feel_detail smallint, feel_color smallint, feel_scale smallint, artist_is_demo boolean
)
language sql stable
set search_path = public
as $$
  select w.id, w.image_path, w.thumb_path, w.width, w.height, w.caption, w.created_at,
         a.slug, a.display_name, a.studio,
         coalesce((select array_agg(t.tag order by t.tag) from work_tags t where t.work_id = w.id), '{}'),
         w.feel_weight, w.feel_detail, w.feel_color, w.feel_scale, a.is_demo
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
