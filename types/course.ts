/**
 * Course domain types
 */

import type { Difficulty, CourseParameters } from "./database";
import type { LatLng } from "./map";

/** Input to the course generator */
export interface CourseGenerationRequest {
  mapAreaId: string;
  difficulty: Difficulty;
  controlCount: number;
  seed?: number;
  parameters?: Partial<CourseParameters>;
}

/** Output of the course generator */
export interface GeneratedCourse {
  controls: GeneratedControl[];
  seed: number;
  generatorVersion: string;
  parameters: CourseParameters;
  estimatedDistance_m: number;
  estimatedElevation_m: number | null;
  validation: CourseValidation;
}

export interface GeneratedControl {
  sequence: number;
  position: LatLng;
  featureType: string | null;
  /** Why this control was placed here */
  rationale: string;
}

export interface CourseValidation {
  isValid: boolean;
  errors: CourseValidationError[];
  warnings: CourseValidationWarning[];
}

export interface CourseValidationError {
  type: "outside_boundary" | "overlap" | "insufficient_spacing" | "impossible_geometry" | "missing_data";
  message: string;
  controlIndex?: number;
}

export interface CourseValidationWarning {
  type: "low_confidence" | "missing_elevation" | "limited_features";
  message: string;
}

/**
 * Difficulty configuration — documented, not black-box
 */
export interface DifficultyConfig {
  difficulty: Difficulty;
  label: string;
  minLegDistance_m: number;
  maxLegDistance_m: number;
  minDirectionChange_deg: number;
  preferComplexTerrain: boolean;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    difficulty: "easy",
    label: "Mudah",
    minLegDistance_m: 100,
    maxLegDistance_m: 300,
    minDirectionChange_deg: 0,
    preferComplexTerrain: false,
    description: "Jarak pendek, perubahan arah minimal, jalur jelas",
  },
  medium: {
    difficulty: "medium",
    label: "Sedang",
    minLegDistance_m: 200,
    maxLegDistance_m: 500,
    minDirectionChange_deg: 30,
    preferComplexTerrain: false,
    description: "Jarak sedang, beberapa perubahan arah",
  },
  hard: {
    difficulty: "hard",
    label: "Sulit",
    minLegDistance_m: 300,
    maxLegDistance_m: 800,
    minDirectionChange_deg: 45,
    preferComplexTerrain: true,
    description: "Jarak panjang, perubahan arah signifikan, medan kompleks",
  },
  very_hard: {
    difficulty: "very_hard",
    label: "Sangat Sulit",
    minLegDistance_m: 400,
    maxLegDistance_m: 1200,
    minDirectionChange_deg: 60,
    preferComplexTerrain: true,
    description: "Jarak sangat panjang, banyak pilihan rute, medan sangat kompleks",
  },
};
