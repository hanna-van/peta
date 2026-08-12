import { describe, it, expect } from "vitest";
import { CourseGenerator } from "./CourseGenerator";

const sampleBoundary: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [106.84, -6.2],
      [106.86, -6.2],
      [106.86, -6.22],
      [106.84, -6.22],
      [106.84, -6.2],
    ],
  ],
};

describe("CourseGenerator", () => {
  it("should generate 10 controls + start + finish (12 total items)", () => {
    const result = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "medium",
      controlCount: 10,
      seed: 12345,
    });

    expect(result.controls.length).toBe(12); // Start(0) + 10 CPs(1..10) + Finish(11)
    expect(result.controls[0].sequence).toBe(0); // Start
    expect(result.controls[11].sequence).toBe(11); // Finish
  });

  it("should produce reproducible results for the same seed", () => {
    const course1 = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "hard",
      seed: 9999,
    });

    const course2 = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "hard",
      seed: 9999,
    });

    expect(course1.seed).toBe(course2.seed);
    expect(course1.controls[1].position).toEqual(course2.controls[1].position);
    expect(course1.controls[5].position).toEqual(course2.controls[5].position);
    expect(course1.estimatedDistance_m).toBe(course2.estimatedDistance_m);
  });

  it("should produce different courses for different seeds", () => {
    const course1 = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "medium",
      seed: 1111,
    });

    const course2 = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "medium",
      seed: 2222,
    });

    expect(course1.controls[1].position).not.toEqual(course2.controls[1].position);
  });

  it("should pass validation for generated courses inside boundary", () => {
    const result = CourseGenerator.generate({
      boundary: sampleBoundary,
      difficulty: "easy",
      seed: 42,
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.validation.errors.length).toBe(0);
  });
});
