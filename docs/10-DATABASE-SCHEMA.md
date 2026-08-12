# Supabase / PostGIS Database Schema

## Core tables

### profiles
- id uuid PK references auth.users
- display_name
- created_at
- updated_at

### map_areas
- id uuid PK
- user_id uuid
- name text
- description text
- boundary geometry(Polygon, 4326)
- center geometry(Point, 4326)
- source_type text
- map_version text
- metadata jsonb
- created_at
- updated_at

### map_features
- id uuid PK
- map_area_id uuid
- feature_type text
- geometry geometry(Geometry, 4326)
- properties jsonb
- source text
- confidence numeric nullable
- created_at

### courses
- id uuid PK
- user_id uuid
- map_area_id uuid
- name text
- difficulty text
- control_count int
- seed bigint
- generator_version text
- parameters jsonb
- created_at

### course_controls
- id uuid PK
- course_id uuid
- sequence int
- point geometry(Point, 4326)
- feature_type text nullable
- metadata jsonb

### training_sessions
- id uuid PK
- user_id uuid
- course_id uuid
- started_at timestamptz
- finished_at timestamptz
- status text
- duration_seconds numeric
- distance_m numeric
- elevation_gain_m numeric
- summary jsonb
- created_at

### gps_tracks
- id bigint/generated identity
- session_id uuid
- recorded_at timestamptz
- point geometry(Point, 4326)
- altitude_m numeric nullable
- accuracy_m numeric nullable
- speed_mps numeric nullable
- heading_deg numeric nullable

### control_visits
- id uuid PK
- session_id uuid
- control_id uuid
- confirmed_at timestamptz
- confirmation_method text
- position geometry(Point, 4326) nullable
- metadata jsonb

### training_analysis
- id uuid PK
- session_id uuid unique
- overall jsonb
- legs jsonb
- events jsonb
- created_at

## Security
Enable RLS on all user-owned tables. Users can read/write only their own maps, courses, sessions, tracks, and analyses. Map data shared intentionally can use a separate documented sharing policy.

## Indexes
Use spatial indexes on geometry columns and normal indexes on user_id, session_id, course_id, timestamps. Do not add indexes without a query/use-case rationale.

## Migrations
All schema changes must be committed as Supabase migrations. Never rely on manual dashboard-only schema changes for production.
