/**
 * Analysis domain types
 */

import type { ConfidenceLevel } from "./database";

/** Replay playback state */
export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  startTime: number;
  endTime: number;
  playbackSpeed: PlaybackSpeed;
  followCamera: boolean;
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4, 8];

/** Replay event for timeline display */
export interface ReplayEvent {
  timestamp: number;
  type: "start" | "control_found" | "pause" | "resume" | "potential_deviation" | "finish";
  label: string;
  controlSequence?: number;
}

/** Analysis result displayed to user (Indonesian) */
export interface AnalysisDisplay {
  /** Overall summary */
  summary: {
    totalTime: string;
    totalDistance: string;
    elevationGain: string | null;
    controlsFound: string;
    gpsQuality: string;
  };
  /** Per-leg breakdown */
  legs: LegDisplay[];
  /** Notable events */
  events: EventDisplay[];
}

export interface LegDisplay {
  legNumber: number;
  fromLabel: string;
  toLabel: string;
  time: string;
  distance: string;
  elevation: string | null;
  issue: IssueDisplay | null;
  coachingNote: string | null;
}

export interface IssueDisplay {
  description: string;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  estimatedTimeLoss: string | null;
}

export interface EventDisplay {
  time: string;
  label: string;
  type: string;
  confidence: ConfidenceLevel;
}

/** Confidence labels in Indonesian */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};
