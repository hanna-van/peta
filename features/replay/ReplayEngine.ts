/**
 * ReplayEngine — interpolates athlete position along GPS track using timestamps.
 * Docs: docs/08-REPLAY-SYSTEM.md
 */

import type { GpsTrack, ControlVisit } from "@/types/database";
import type { ReplayState, PlaybackSpeed, ReplayEvent } from "@/types/analysis";
import type { LatLng } from "@/types/map";

export class ReplayEngine {
  /** Interpolate athlete position at a specific timestamp */
  static getPositionAtTime(tracks: GpsTrack[], timestampMs: number): LatLng | null {
    if (tracks.length === 0) return null;

    const firstTime = new Date(tracks[0].recorded_at).getTime();
    const lastTime = new Date(tracks[tracks.length - 1].recorded_at).getTime();

    if (timestampMs <= firstTime) {
      const p = tracks[0].point.coordinates;
      return { lat: p[1], lng: p[0] };
    }

    if (timestampMs >= lastTime) {
      const p = tracks[tracks.length - 1].point.coordinates;
      return { lat: p[1], lng: p[0] };
    }

    // Binary search for surrounding track points
    let low = 0;
    let high = tracks.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midTime = new Date(tracks[mid].recorded_at).getTime();

      if (midTime === timestampMs) {
        const p = tracks[mid].point.coordinates;
        return { lat: p[1], lng: p[0] };
      }

      if (midTime < timestampMs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx = Math.max(0, high);
    const p1 = tracks[idx];
    const p2 = tracks[Math.min(tracks.length - 1, idx + 1)];

    const t1 = new Date(p1.recorded_at).getTime();
    const t2 = new Date(p2.recorded_at).getTime();

    if (t2 === t1) {
      return { lat: p1.point.coordinates[1], lng: p1.point.coordinates[0] };
    }

    // Linear interpolation
    const ratio = (timestampMs - t1) / (t2 - t1);
    const lat = p1.point.coordinates[1] + ratio * (p2.point.coordinates[1] - p1.point.coordinates[1]);
    const lng = p1.point.coordinates[0] + ratio * (p2.point.coordinates[0] - p1.point.coordinates[0]);

    return { lat, lng };
  }

  /** Build timeline events list */
  static buildEvents(tracks: GpsTrack[], visits: ControlVisit[]): ReplayEvent[] {
    const events: ReplayEvent[] = [];
    if (tracks.length === 0) return events;

    const startTime = new Date(tracks[0].recorded_at).getTime();
    const finishTime = new Date(tracks[tracks.length - 1].recorded_at).getTime();

    events.push({
      timestamp: startTime,
      type: "start",
      label: "Start",
    });

    visits.forEach((v, i) => {
      events.push({
        timestamp: new Date(v.confirmed_at).getTime(),
        type: "control_found",
        label: `CP ${i + 1}`,
        controlSequence: i + 1,
      });
    });

    events.push({
      timestamp: finishTime,
      type: "finish",
      label: "Finish",
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
}
