/**
 * AnalysisEngine — computes leg splits, GPS quality, and potential navigation errors.
 * Docs: docs/09-ANALYSIS-ENGINE.md
 * Wording rules:
 * - "Potensi keluar jalur — kepercayaan sedang"
 * - Estimates must be explicitly labeled as estimates
 */

import { distanceMeters, routeDistance } from "@/lib/geo";
import type { GpsTrack, ControlVisit, CourseControl } from "@/types/database";
import type {
  OverallAnalysis,
  LegAnalysis,
  AnalysisEvent,
  GpsQualityRating,
} from "@/types/database";

export class AnalysisEngine {
  /** Run full analysis on a completed session */
  static analyze(
    tracks: GpsTrack[],
    visits: ControlVisit[],
    controls: CourseControl[]
  ): {
    overall: OverallAnalysis;
    legs: LegAnalysis[];
    events: AnalysisEvent[];
  } {
    const totalDurationS =
      tracks.length > 1
        ? Math.floor(
            (new Date(tracks[tracks.length - 1].recorded_at).getTime() -
              new Date(tracks[0].recorded_at).getTime()) /
              1000
          )
        : 0;

    const totalDistanceM = routeDistance(
      tracks.map((t) => ({ lat: t.point.coordinates[1], lng: t.point.coordinates[0] }))
    );

    // Assess GPS quality
    const gpsQuality = this.assessGpsQuality(tracks);

    // Compute leg splits
    const legs: LegAnalysis[] = [];
    const events: AnalysisEvent[] = [];

    // Sort visits by confirmed_at timestamp
    const sortedVisits = [...visits].sort(
      (a, b) => new Date(a.confirmed_at).getTime() - new Date(b.confirmed_at).getTime()
    );

    // Calculate leg metrics for each leg
    for (let i = 0; i < sortedVisits.length; i++) {
      const currentVisit = sortedVisits[i];
      const prevVisitTime =
        i === 0
          ? tracks.length > 0
            ? new Date(tracks[0].recorded_at).getTime()
            : new Date(currentVisit.confirmed_at).getTime()
          : new Date(sortedVisits[i - 1].confirmed_at).getTime();

      const legFinishTime = new Date(currentVisit.confirmed_at).getTime();
      const legDurationS = Math.max(1, Math.floor((legFinishTime - prevVisitTime) / 1000));

      // Filter tracks corresponding to this leg
      const legTracks = tracks.filter((t) => {
        const tTime = new Date(t.recorded_at).getTime();
        return tTime >= prevVisitTime && tTime <= legFinishTime;
      });

      const legDistM = routeDistance(
        legTracks.map((t) => ({ lat: t.point.coordinates[1], lng: t.point.coordinates[0] }))
      );

      // Check straight-line distance between control points
      const fromCtrl = controls.find((c) => c.sequence === i) || controls[0];
      const toCtrl = controls.find((c) => c.sequence === i + 1) || controls[controls.length - 1];

      const straightLineM =
        fromCtrl && toCtrl
          ? distanceMeters(
              { lat: fromCtrl.point.coordinates[1], lng: fromCtrl.point.coordinates[0] },
              { lat: toCtrl.point.coordinates[1], lng: toCtrl.point.coordinates[0] }
            )
          : legDistM;

      // Calculate Pace
      let paceStr: string | null = null;
      if (legDistM > 10) {
        const legSpeedMps = legDistM / legDurationS;
        if (legSpeedMps > 0.1) {
          const speedKmh = legSpeedMps * 3.6;
          const paceDec = 60 / speedKmh;
          const paceMin = Math.floor(paceDec);
          const paceSec = Math.floor((paceDec - paceMin) * 60).toString().padStart(2, "0");
          if (paceMin < 60) paceStr = `${paceMin}:${paceSec}`;
        }
      }

      // Calculate Efficiency
      let efficiencyPct: number | null = null;
      if (straightLineM > 10 && legDistM > 0) {
        efficiencyPct = Math.round((straightLineM / legDistM) * 100);
        if (efficiencyPct > 100) efficiencyPct = 100;
      }

      // Detect potential deviation (if actual distance > 1.4x straight line)
      let potentialIssue: string | null = null;
      let coachingNote: string | null = null;

      const timeLossEst = Math.round(legDurationS * (1 - straightLineM / Math.max(legDistM, 1)));
      const legSpeedMps = legDistM / Math.max(legDurationS, 1);

      if (straightLineM > 50 && efficiencyPct !== null && efficiencyPct < 85) {
        if (legSpeedMps > 2.0 && efficiencyPct < 75) {
          potentialIssue = "Bearing Error — Kepercayaan Tinggi";
          coachingNote = `Anda berlari cukup cepat (${paceStr}/km) namun melenceng jauh dari arah kompas. Waktu terbuang: ±${Math.floor(timeLossEst / 60)}:${(timeLossEst % 60).toString().padStart(2, "0")}. Selalu kalibrasi ulang kompas!`;
          events.push({
            timestamp: new Date((prevVisitTime + legFinishTime) / 2).toISOString(),
            leg: i + 1,
            type: "potential_deviation",
            confidence: "high",
            reason: "Bearing error: Fast movement but very low route efficiency.",
            estimated_impact_s: timeLossEst,
          });
        } else if (legSpeedMps < 1.5 && efficiencyPct < 75) {
          potentialIssue = "Searching Error — Kepercayaan Sedang";
          coachingNote = `Anda bergerak lambat dan berputar-putar (Pace: ${paceStr}/km). Indikasi kebingungan mencari pos atau salah jalur. Waktu terbuang: ±${Math.floor(timeLossEst / 60)}:${(timeLossEst % 60).toString().padStart(2, "0")}.`;
          events.push({
            timestamp: new Date((prevVisitTime + legFinishTime) / 2).toISOString(),
            leg: i + 1,
            type: "time_loss",
            confidence: "medium",
            reason: "Searching error: Slow movement and low efficiency.",
            estimated_impact_s: timeLossEst,
          });
        } else {
          potentialIssue = "Potensi Keluar Jalur";
          coachingNote = `Rute yang ditempuh lebih panjang dari jarak optimal. Perkiraan waktu terbuang: ±${Math.floor(timeLossEst / 60)}:${(timeLossEst % 60).toString().padStart(2, "0")}.`;
        }
      } else {
        coachingNote = "Navigasi leg berjalan sangat lancar dan efisien.";
      }

      legs.push({
        leg_number: i + 1,
        from_control: i,
        to_control: i + 1,
        duration_s: legDurationS,
        distance_m: Math.round(legDistM),
        elevation_m: null,
        pace_min_km: paceStr,
        efficiency_pct: efficiencyPct,
        events: [],
        potential_issue: potentialIssue,
        coaching_note: coachingNote,
      });
    }

    const overall: OverallAnalysis = {
      total_duration_s: totalDurationS,
      total_distance_m: Math.round(totalDistanceM),
      elevation_gain_m: null,
      controls_found: sortedVisits.length,
      total_controls: Math.max(0, controls.length - 2),
      avg_speed_mps: totalDurationS > 0 ? totalDistanceM / totalDurationS : null,
      max_speed_mps: null,
      gps_quality: gpsQuality,
    };

    return { overall, legs, events };
  }

  /** Assess overall GPS quality based on sample accuracy */
  private static assessGpsQuality(tracks: GpsTrack[]): GpsQualityRating {
    if (tracks.length < 5) return "insufficient";

    let accurateCount = 0;
    tracks.forEach((t) => {
      if (t.accuracy_m !== null && t.accuracy_m <= 15) {
        accurateCount++;
      }
    });

    const ratio = accurateCount / tracks.length;
    if (ratio >= 0.8) return "high";
    if (ratio >= 0.5) return "medium";
    return "low";
  }
}
