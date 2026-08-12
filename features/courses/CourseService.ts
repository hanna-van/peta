/**
 * CourseService — domain service for persisting and managing courses in Supabase.
 */

import { createClient } from "@/lib/supabase/client";
import type { Course, CourseControl, Difficulty } from "@/types/database";
import type { GeneratedCourse } from "@/types/course";

export class CourseService {
  /** Save a generated course and its controls to Supabase */
  static async saveCourse(
    mapAreaId: string,
    name: string,
    generated: GeneratedCourse
  ): Promise<{ course: Course | null; error: string | null }> {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        return { course: null, error: "Belum masuk akun." };
      }

      // 1. Insert course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          user_id: userData.user.id,
          map_area_id: mapAreaId,
          name,
          difficulty: (generated.parameters.difficulty as Difficulty) || "medium",
          control_count: generated.controls.length - 2, // exclude start and finish
          seed: generated.seed,
          generator_version: generated.generatorVersion,
          parameters: generated.parameters,
        })
        .select()
        .single();

      if (courseError || !courseData) {
        return { course: null, error: courseError?.message || "Gagal menyimpan jalur." };
      }

      const course = courseData as Course;

      // 2. Insert controls
      const controlRecords = generated.controls.map((c) => ({
        course_id: course.id,
        sequence: c.sequence,
        point: {
          type: "Point",
          coordinates: [c.position.lng, c.position.lat],
        },
        feature_type: c.featureType,
        metadata: { rationale: c.rationale },
      }));

      const { error: controlsError } = await supabase
        .from("course_controls")
        .insert(controlRecords);

      if (controlsError) {
        return { course: null, error: "Gagal menyimpan kontrol jalur." };
      }

      return { course, error: null };
    } catch (err) {
      return {
        course: null,
        error: err instanceof Error ? err.message : "Terjadi kesalahan.",
      };
    }
  }

  /** Fetch course by ID with its controls */
  static async getCourseWithControls(courseId: string): Promise<{
    course: Course | null;
    controls: CourseControl[];
  }> {
    try {
      const supabase = createClient();
      const { data: course, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (cErr || !course) return { course: null, controls: [] };

      const { data: controls, error: ctrlErr } = await supabase
        .from("course_controls")
        .select("*")
        .eq("course_id", courseId)
        .order("sequence", { ascending: true });

      if (ctrlErr || !controls) return { course: course as Course, controls: [] };

      return {
        course: course as Course,
        controls: controls as CourseControl[],
      };
    } catch {
      return { course: null, controls: [] };
    }
  }
}
