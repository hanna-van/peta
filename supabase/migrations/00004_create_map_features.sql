-- Map features — geographic features within a map area
create table public.map_features (
  id uuid primary key default gen_random_uuid(),
  map_area_id uuid not null references public.map_areas on delete cascade,
  feature_type text not null,
  geometry geometry(Geometry, 4326) not null,
  properties jsonb default '{}',
  source text,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

-- RLS: users can access features of their own map areas
alter table public.map_features enable row level security;

create policy "Users can view features of own map areas"
  on public.map_features for select
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

create policy "Users can insert features to own map areas"
  on public.map_features for insert
  with check (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

create policy "Users can update features of own map areas"
  on public.map_features for update
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

create policy "Users can delete features of own map areas"
  on public.map_features for delete
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );
