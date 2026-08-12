/**
 * Database schema types — mirrors the Supabase/PostGIS schema
 * from docs/10-DATABASE-SCHEMA.md
 */

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MapArea {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  /** PostGIS Polygon in WGS84 — stored as GeoJSON when read */
  boundary: GeoJSON.Polygon | null;
  /** PostGIS Point in WGS84 — stored as GeoJSON when read */
  center: GeoJSON.Point | null;
  source_type: MapSourceType;
  map_version: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type MapSourceType = "osm" | "import" | "survey" | "manual";

export interface MapFeature {
  id: string;
  map_area_id: string;
  feature_type: FeatureType;
  /** PostGIS Geometry in WGS84 — stored as GeoJSON when read */
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown> | null;
  source: string | null;
  confidence: number | null;
  created_at: string;
}

export type FeatureType =
  | "trail"
  | "road"
  | "building"
  | "water"
  | "vegetation"
  | "fence"
  | "ditch"
  | "boulder"
  | "tree"
  | "open_area"
  | "contour"
  | "other";

export interface Course {
  id: string;
  user_id: string;
  map_area_id: string;
  name: string;
  difficulty: Difficulty;
  control_count: number;
  seed: number;
  generator_version: string;
  parameters: CourseParameters;
  created_at: string;
}

export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

export interface CourseParameters {
  min_leg_distance_m?: number;
  max_leg_distance_m?: number;
  elevation_target_m?: number;
  [key: string]: unknown;
}

export interface CourseControl {
  id: string;
  course_id: string;
  sequence: number;
  /** PostGIS Point in WGS84 — stored as GeoJSON when read */
  point: GeoJSON.Point;
  feature_type: FeatureType | null;
  metadata: Record<string, unknown> | null;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  course_id: string;
  started_at: string | null;
  finished_at: string | null;
  status: SessionStatus;
  duration_seconds: number | null;
  distance_m: number | null;
  elevation_gain_m: number | null;
  summary: SessionSummary | null;
  created_at: string;
}

export type SessionStatus =
  | "ready"
  | "countdown"
  | "active"
  | "paused"
  | "interrupted"
  | "finished"
  | "processing"
  | "analyzed";

export interface SessionSummary {
  controls_found: number;
  total_controls: number;
  avg_accuracy_m?: number;
  gps_sample_count?: number;
  [key: string]: unknown;
}

export interface GpsTrack {
  id: number;
  session_id: string;
  recorded_at: string;
  /** PostGIS Point in WGS84 — stored as GeoJSON when read */
  point: GeoJSON.Point;
  altitude_m: number | null;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
}

export interface ControlVisit {
  id: string;
  session_id: string;
  control_id: string;
  confirmed_at: string;
  confirmation_method: ConfirmationMethod;
  /** PostGIS Point in WGS84 — position at confirmation time */
  position: GeoJSON.Point | null;
  metadata: Record<string, unknown> | null;
}

export type ConfirmationMethod = "manual" | "proximity" | "auto";

export interface TrainingAnalysis {
  id: string;
  session_id: string;
  overall: OverallAnalysis;
  legs: LegAnalysis[];
  events: AnalysisEvent[];
  created_at: string;
}

export interface OverallAnalysis {
  total_duration_s: number;
  total_distance_m: number;
  elevation_gain_m: number | null;
  controls_found: number;
  total_controls: number;
  avg_speed_mps: number | null;
  max_speed_mps: number | null;
  gps_quality: GpsQualityRating;
}

export type GpsQualityRating = "high" | "medium" | "low" | "insufficient";

export interface LegAnalysis {
  leg_number: number;
  from_control: number;
  to_control: number;
  duration_s: number;
  distance_m: number;
  elevation_m: number | null;
  events: AnalysisEvent[];
  potential_issue: string | null;
  coaching_note: string | null;
}

export interface AnalysisEvent {
  timestamp: string;
  leg: number;
  type: AnalysisEventType;
  confidence: ConfidenceLevel;
  reason: string;
  estimated_impact_s: number | null;
}

export type AnalysisEventType =
  | "potential_deviation"
  | "time_loss"
  | "stop"
  | "backtrack"
  | "control_found";

export type ConfidenceLevel = "high" | "medium" | "low";
