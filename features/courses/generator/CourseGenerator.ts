/**
 * CourseGenerator — Realistic Orienteering Course Generator.
 * Docs: docs/05-COURSE-GENERATOR.md
 *
 * Rules:
 * 1. Default 10 controls
 * 2. Reproducible via seed (Mulberry32 PRNG)
 * 3. Configurable difficulty (easy, medium, hard, very_hard)
 * 4. Considers feature placement (trails, boulders, trees, hilltops)
 * 5. Strict validation (spacing, boundary, geometry)
 */

import {
  distanceMeters,
  bearing,
  destination,
  polygonBBox,
  isInsideBoundary,
  bboxCenter,
} from "@/lib/geo";
import { DIFFICULTY_CONFIGS } from "@/types/course";
import type { Difficulty, FeatureType } from "@/types/database";
import type {
  GeneratedCourse,
  GeneratedControl,
  CourseValidation,
  CourseValidationError,
  CourseValidationWarning,
} from "@/types/course";
import type { LatLng } from "@/types/map";

export const CURRENT_GENERATOR_VERSION = "1.0.0";

/** Seeded PRNG (Mulberry32) */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenerateCourseOptions {
  boundary: GeoJSON.Polygon;
  difficulty: Difficulty;
  controlCount?: number;
  seed?: number;
  existingFeatures?: { type: FeatureType; position: LatLng }[];
}

export class CourseGenerator {
  /** Generate a reproducible orienteering course */
  static generate(options: GenerateCourseOptions): GeneratedCourse {
    const seed = options.seed ?? Math.floor(Math.random() * 1000000);
    const prng = createPRNG(seed);
    const controlCount = options.controlCount ?? 10;
    const diffConfig = DIFFICULTY_CONFIGS[options.difficulty];

    const bbox = polygonBBox(options.boundary);
    const center = bboxCenter(bbox);

    const controls: GeneratedControl[] = [];
    const featurePool = options.existingFeatures || [];

    // 1. Place Start point (Control #0, sequence 0)
    // Find a valid point near the center inside the boundary
    let startPos = center;
    if (!isInsideBoundary(startPos, options.boundary)) {
      startPos = this.findPointInside(options.boundary, prng, bbox) || center;
    }

    controls.push({
      sequence: 0, // 0 = Start (Triangle)
      position: startPos,
      featureType: "open_area",
      rationale: "Titik Start (Segitiga)",
    });

    // 2. Step-by-step control placement
    let currentPos = startPos;
    let previousBearing = 0;

    for (let i = 1; i <= controlCount; i++) {
      let bestCandidate: GeneratedControl | null = null;

      // Try candidate placement iterations
      for (let attempt = 0; attempt < 50; attempt++) {
        // Target leg distance based on difficulty range
        const legDist =
          diffConfig.minLegDistance_m +
          prng() *
            (diffConfig.maxLegDistance_m - diffConfig.minLegDistance_m);

        // Direction change requirement
        const angleDelta = (prng() - 0.5) * 180; // -90 to +90 deg
        const targetBearing = (previousBearing + angleDelta + 360) % 360;

        let candidatePos = destination(currentPos, legDist, targetBearing);

        // If candidate is outside boundary, retry with random angle inside bbox
        if (!isInsideBoundary(candidatePos, options.boundary)) {
          const inside = this.findPointInside(options.boundary, prng, bbox);
          if (inside) candidatePos = inside;
          else continue;
        }

        // Check spacing from existing controls
        const tooClose = controls.some(
          (c) => distanceMeters(c.position, candidatePos) < diffConfig.minLegDistance_m * 0.4
        );
        if (tooClose) continue;

        // Candidate feature matching (prefer features if available)
        let featureType: FeatureType | null = null;
        const nearestFeature = featurePool.find(
          (f) => distanceMeters(f.position, candidatePos) < 40
        );

        if (nearestFeature) {
          candidatePos = nearestFeature.position;
          featureType = nearestFeature.type;
        }

        bestCandidate = {
          sequence: i,
          position: candidatePos,
          featureType: featureType || "trail",
          rationale: `CP ${i} — ${featureType ? `Fitur ${featureType}` : "Persimpangan & Perubahan Arah"}`,
        };

        previousBearing = bearing(currentPos, candidatePos);
        break;
      }

      // Fallback if candidate search exhausted
      if (!bestCandidate) {
        const fallbackPos =
          this.findPointInside(options.boundary, prng, bbox) || currentPos;
        bestCandidate = {
          sequence: i,
          position: fallbackPos,
          featureType: "other",
          rationale: `CP ${i} (Posisi Alternatif)`,
        };
      }

      controls.push(bestCandidate);
      currentPos = bestCandidate.position;
    }

    // 3. Place Finish point (Control #controlCount + 1, or loop to Start area)
    const finishPos = destination(
      currentPos,
      Math.max(100, diffConfig.minLegDistance_m * 0.5),
      (previousBearing + 45) % 360
    );

    const validFinish = isInsideBoundary(finishPos, options.boundary)
      ? finishPos
      : startPos;

    controls.push({
      sequence: controlCount + 1, // Final sequence = Finish (Double Circle)
      position: validFinish,
      featureType: "open_area",
      rationale: "Titik Finish (Lingkaran Ganda)",
    });

    // 4. Calculate total distance & elevation estimates
    let totalDist = 0;
    for (let k = 1; k < controls.length; k++) {
      totalDist += distanceMeters(controls[k - 1].position, controls[k].position);
    }

    // 5. Run course validation
    const validation = this.validateCourse(controls, options.boundary, diffConfig);

    return {
      controls,
      seed,
      generatorVersion: CURRENT_GENERATOR_VERSION,
      parameters: {
        difficulty: options.difficulty,
        min_leg_distance_m: diffConfig.minLegDistance_m,
        max_leg_distance_m: diffConfig.maxLegDistance_m,
      },
      estimatedDistance_m: totalDist,
      estimatedElevation_m: null,
      validation,
    };
  }

  /** Find a random point inside boundary polygon */
  private static findPointInside(
    boundary: GeoJSON.Polygon,
    prng: () => number,
    bbox: [number, number, number, number]
  ): LatLng | null {
    const [west, south, east, north] = bbox;
    for (let i = 0; i < 30; i++) {
      const lat = south + prng() * (north - south);
      const lng = west + prng() * (east - west);
      const pt = { lat, lng };
      if (isInsideBoundary(pt, boundary)) return pt;
    }
    return null;
  }

  /** Validate course sanity per docs/05-COURSE-GENERATOR.md */
  static validateCourse(
    controls: GeneratedControl[],
    boundary: GeoJSON.Polygon,
    diffConfig: typeof DIFFICULTY_CONFIGS["easy"]
  ): CourseValidation {
    const errors: CourseValidationError[] = [];
    const warnings: CourseValidationWarning[] = [];

    // Rule 1: All controls inside boundary
    controls.forEach((c, idx) => {
      if (!isInsideBoundary(c.position, boundary)) {
        errors.push({
          type: "outside_boundary",
          message: `Posisi CP #${c.sequence} berada di luar batas area peta.`,
          controlIndex: idx,
        });
      }
    });

    // Rule 2: Minimum leg distance check
    for (let i = 1; i < controls.length; i++) {
      const d = distanceMeters(controls[i - 1].position, controls[i].position);
      if (d < 30) {
        errors.push({
          type: "insufficient_spacing",
          message: `Jarak Leg ${i - 1}→${i} terlalu pendek (${Math.round(d)}m < 30m).`,
          controlIndex: i,
        });
      }
    }

    if (errors.length === 0) {
      warnings.push({
        type: "missing_elevation",
        message: "Data elevasi medan belum dihitung.",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
