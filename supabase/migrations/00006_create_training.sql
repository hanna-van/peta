-- Training sessions
create table public.training_sessions (
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

-- RLS
alter table public.training_sessions enable row level security;

create policy "Users can view own sessions"
  on public.training_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.training_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.training_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.training_sessions for delete
  using (auth.uid() = user_id);

-- GPS tracks — raw GPS samples recorded during training
create table public.gps_tracks (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions on delete cascade,
  recorded_at timestamptz not null,
  point geometry(Point, 4326) not null,
  altitude_m numeric,
  accuracy_m numeric,
  speed_mps numeric,
  heading_deg numeric
);

-- RLS: via session ownership
alter table public.gps_tracks enable row level security;

create policy "Users can view own GPS tracks"
  on public.gps_tracks for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = gps_tracks.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own GPS tracks"
  on public.gps_tracks for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = gps_tracks.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

-- Control visits — when a CP was confirmed during training
create table public.control_visits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions on delete cascade,
  control_id uuid not null references public.course_controls on delete cascade,
  confirmed_at timestamptz not null,
  confirmation_method text not null default 'manual',
  position geometry(Point, 4326),
  metadata jsonb default '{}'
);

-- RLS: via session ownership
alter table public.control_visits enable row level security;

create policy "Users can view own control visits"
  on public.control_visits for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = control_visits.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own control visits"
  on public.control_visits for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = control_visits.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

-- Training analysis — computed analysis for a session
create table public.training_analysis (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.training_sessions on delete cascade,
  overall jsonb not null default '{}',
  legs jsonb not null default '[]',
  events jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- RLS: via session ownership
alter table public.training_analysis enable row level security;

create policy "Users can view own analysis"
  on public.training_analysis for select
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own analysis"
  on public.training_analysis for insert
  with check (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update own analysis"
  on public.training_analysis for update
  using (
    exists (
      select 1 from public.training_sessions
      where training_sessions.id = training_analysis.session_id
        and training_sessions.user_id = auth.uid()
    )
  );
