-- =============================================================================
-- Combined Migration Script for Orienteering Training & Analysis Platform
-- Project URL: https://ktutopwggwvomnduywml.supabase.co
-- Run this script in your Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Enable PostGIS extension for spatial data support
create extension if not exists "postgis" with schema "extensions";

-- 2. Profiles table — extends Supabase auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Map areas — user-defined training area boundaries
create table if not exists public.map_areas (
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

alter table public.map_areas enable row level security;

drop policy if exists "Users can view own map areas" on public.map_areas;
create policy "Users can view own map areas"
  on public.map_areas for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own map areas" on public.map_areas;
create policy "Users can insert own map areas"
  on public.map_areas for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own map areas" on public.map_areas;
create policy "Users can update own map areas"
  on public.map_areas for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own map areas" on public.map_areas;
create policy "Users can delete own map areas"
  on public.map_areas for delete
  using (auth.uid() = user_id);

-- 4. Map features — geographic features within a map area
create table if not exists public.map_features (
  id uuid primary key default gen_random_uuid(),
  map_area_id uuid not null references public.map_areas on delete cascade,
  feature_type text not null,
  geometry geometry(Geometry, 4326) not null,
  properties jsonb default '{}',
  source text,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

alter table public.map_features enable row level security;

drop policy if exists "Users can view features of own map areas" on public.map_features;
create policy "Users can view features of own map areas"
  on public.map_features for select
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert features to own map areas" on public.map_features;
create policy "Users can insert features to own map areas"
  on public.map_features for insert
  with check (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update features of own map areas" on public.map_features;
create policy "Users can update features of own map areas"
  on public.map_features for update
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete features of own map areas" on public.map_features;
create policy "Users can delete features of own map areas"
  on public.map_features for delete
  using (
    exists (
      select 1 from public.map_areas
      where map_areas.id = map_features.map_area_id
        and map_areas.user_id = auth.uid()
    )
  );

-- 5. Courses & Course Controls
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  map_area_id uuid not null references public.map_areas on delete cascade,
  name text not null,
  difficulty text not null default 'medium',
  control_count integer not null default 10,
  seed bigint not null,
  generator_version text not null,
  parameters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

drop policy if exists "Users can view own courses" on public.courses;
create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own courses" on public.courses;
create policy "Users can insert own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own courses" on public.courses;
create policy "Users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own courses" on public.courses;
create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);

create table if not exists public.course_controls (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  sequence integer not null,
  point geometry(Point, 4326) not null,
  feature_type text,
  metadata jsonb default '{}',
  unique (course_id, sequence)
);

alter table public.course_controls enable row level security;

drop policy if exists "Users can view controls of own courses" on public.course_controls;
create policy "Users can view controls of own courses"
  on public.course_controls for select
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert controls to own courses" on public.course_controls;
create policy "Users can insert controls to own courses"
  on public.course_controls for insert
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update controls of own courses" on public.course_controls;
create policy "Users can update controls of own courses"
  on public.course_controls for update
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete controls of own courses" on public.course_controls;
create policy "Users can delete controls of own courses"
  on public.course_controls for delete
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

-- 6. Training sessions, GPS tracks, Control visits, Training analysis
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  started_at timestamptz,
  finished_at timestamptz,
  status text not null default 'ready',
  duration_seconds numeric,
  distance_m numeric,
  elevation_gain_m numeric,
  summary jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.training_sessions enable row level security;

drop policy if exists "Users can view own sessions" on public.training_sessions;
create policy "Users can view own sessions"
  on public.training_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.training_sessions;
create policy "Users can insert own sessions"
  on public.training_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.training_sessions;
create policy "Users can update own sessions"
  on public.training_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.training_sessions;
create policy "Users can delete own sessions"
  on public.training_sessions for delete
  using (auth.uid() = user_id);

create table if not exists public.gps_tracks (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions on delete cascade,
  recorded_at timestamptz not null,
  point geometry(Point, 4326) not null,
  altitude_m numeric,
  accuracy_m numeric,
  speed_mps numeric,
  heading_deg numeric
);

alter table public.gps_tracks enable row level security;

drop policy if exists "Users can view own GPS tracks" on public.gps_tracks;
create policy "Users can view own GPS tracks"
  on public.gps_tracks for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = gps_tracks.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own GPS tracks" on public.gps_tracks;
create policy "Users can insert own GPS tracks"
  on public.gps_tracks for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = gps_tracks.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create table if not exists public.control_visits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions on delete cascade,
  control_id uuid not null references public.course_controls on delete cascade,
  confirmed_at timestamptz not null,
  confirmation_method text not null default 'manual',
  position geometry(Point, 4326),
  metadata jsonb default '{}'
);

alter table public.control_visits enable row level security;

drop policy if exists "Users can view own control visits" on public.control_visits;
create policy "Users can view own control visits"
  on public.control_visits for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = control_visits.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own control visits" on public.control_visits;
create policy "Users can insert own control visits"
  on public.control_visits for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = control_visits.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create table if not exists public.training_analysis (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.training_sessions on delete cascade,
  overall jsonb not null default '{}',
  legs jsonb not null default '[]',
  events jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.training_analysis enable row level security;

drop policy if exists "Users can view own analysis" on public.training_analysis;
create policy "Users can view own analysis"
  on public.training_analysis for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own analysis" on public.training_analysis;
create policy "Users can insert own analysis"
  on public.training_analysis for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own analysis" on public.training_analysis;
create policy "Users can update own analysis"
  on public.training_analysis for update
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

-- 7. Indexes
create index if not exists idx_map_areas_boundary on public.map_areas using gist (boundary);
create index if not exists idx_map_areas_center on public.map_areas using gist (center);
create index if not exists idx_map_features_geometry on public.map_features using gist (geometry);
create index if not exists idx_course_controls_point on public.course_controls using gist (point);
create index if not exists idx_gps_tracks_point on public.gps_tracks (point);
create index if not exists idx_control_visits_position on public.control_visits using gist (position);

create index if not exists idx_map_areas_user_id on public.map_areas (user_id);
create index if not exists idx_map_features_map_area_id on public.map_features (map_area_id);
create index if not exists idx_courses_user_id on public.courses (user_id);
create index if not exists idx_courses_map_area_id on public.courses (map_area_id);
create index if not exists idx_course_controls_course_id on public.course_controls (course_id);
create index if not exists idx_training_sessions_user_id on public.training_sessions (user_id);
create index if not exists idx_training_sessions_course_id on public.training_sessions (course_id);
create index if not exists idx_training_sessions_status on public.training_sessions (status);
create index if not exists idx_training_sessions_started_at on public.training_sessions (started_at desc);
create index if not exists idx_gps_tracks_session_id on public.gps_tracks (session_id);
create index if not exists idx_gps_tracks_recorded_at on public.gps_tracks (session_id, recorded_at);
create index if not exists idx_control_visits_session_id on public.control_visits (session_id);
create index if not exists idx_training_analysis_session_id on public.training_analysis (session_id);
