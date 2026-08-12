-- Spatial indexes on all geometry columns
create index idx_map_areas_boundary on public.map_areas using gist (boundary);
create index idx_map_areas_center on public.map_areas using gist (center);
create index idx_map_features_geometry on public.map_features using gist (geometry);
create index idx_course_controls_point on public.course_controls using gist (point);
create index idx_gps_tracks_point on public.gps_tracks using gist (point);
create index idx_control_visits_position on public.control_visits using gist (position);

-- Foreign key and query indexes
create index idx_map_areas_user_id on public.map_areas (user_id);
create index idx_map_features_map_area_id on public.map_features (map_area_id);
create index idx_courses_user_id on public.courses (user_id);
create index idx_courses_map_area_id on public.courses (map_area_id);
create index idx_course_controls_course_id on public.course_controls (course_id);
create index idx_training_sessions_user_id on public.training_sessions (user_id);
create index idx_training_sessions_course_id on public.training_sessions (course_id);
create index idx_training_sessions_status on public.training_sessions (status);
create index idx_training_sessions_started_at on public.training_sessions (started_at desc);
create index idx_gps_tracks_session_id on public.gps_tracks (session_id);
create index idx_gps_tracks_recorded_at on public.gps_tracks (session_id, recorded_at);
create index idx_control_visits_session_id on public.control_visits (session_id);
create index idx_training_analysis_session_id on public.training_analysis (session_id);
