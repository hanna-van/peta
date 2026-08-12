-- Map areas — user-defined training area boundaries
create table public.map_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  boundary geometry(Polygon, 4326),
  center geometry(Point, 4326),
  source_type text not null default 'osm',
  map_version text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: users can only access their own map areas
alter table public.map_areas enable row level security;

create policy "Users can view own map areas"
  on public.map_areas for select
  using (auth.uid() = user_id);

create policy "Users can insert own map areas"
  on public.map_areas for insert
  with check (auth.uid() = user_id);

create policy "Users can update own map areas"
  on public.map_areas for update
  using (auth.uid() = user_id);

create policy "Users can delete own map areas"
  on public.map_areas for delete
  using (auth.uid() = user_id);
