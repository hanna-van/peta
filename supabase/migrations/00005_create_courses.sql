-- Courses — generated or manually created training courses
create table public.courses (
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

-- RLS
alter table public.courses enable row level security;

create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can insert own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);

-- Course controls — individual control points within a course
create table public.course_controls (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  sequence integer not null,
  point geometry(Point, 4326) not null,
  feature_type text,
  metadata jsonb default '{}',
  unique (course_id, sequence)
);

-- RLS: via course ownership
alter table public.course_controls enable row level security;

create policy "Users can view controls of own courses"
  on public.course_controls for select
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

create policy "Users can insert controls to own courses"
  on public.course_controls for insert
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

create policy "Users can update controls of own courses"
  on public.course_controls for update
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );

create policy "Users can delete controls of own courses"
  on public.course_controls for delete
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_controls.course_id
        and courses.user_id = auth.uid()
    )
  );
