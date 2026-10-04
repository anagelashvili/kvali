-- Placement from the body map on the request page.
-- pos_x/pos_y are in the body map's SVG units (200 × 420, front view).
alter table requests
  add column body_view text not null default 'front' check (body_view in ('front', 'back')),
  add column body_zone text check (length(body_zone) <= 40),
  add column size_cm   smallint check (size_cm between 1 and 60),
  add column pos_x     real check (pos_x between 0 and 200),
  add column pos_y     real check (pos_y between 0 and 420),
  add column style     text references tags on update cascade on delete set null;
