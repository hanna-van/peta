/**
 * Training and GPS domain types
 */

import type { SessionStatus, ConfirmationMethod } from "./database";

/** Raw GPS sample from browser geolocation API */
export interface GpsSample {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

/** GPS recording configuration */
export interface GpsConfig {
  /** Enable high-accuracy mode */
  enableHighAccuracy: boolean;
  /** Maximum age of cached position in ms */
  maximumAge: number;
  /** Timeout for position request in ms */
  timeout: number;
  /** Minimum interval between samples in ms */
  minInterval: number;
}

export const DEFAULT_GPS_CONFIG: GpsConfig = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
  minInterval: 1000,
};

/** GPS permission status */
export type GpsPermissionStatus = "prompt" | "granted" | "denied" | "unavailable";

/** GPS quality assessment */
export interface GpsQualityInfo {
  status: "good" | "fair" | "poor" | "unavailable";
  accuracy_m: number | null;
  message: string;
}

/** Active training session state (kept locally) */
export interface LocalSessionState {
  sessionId: string;
  courseId: string;
  status: SessionStatus;
  startedAt: string | null;
  gpsSamples: GpsSample[];
  controlVisits: LocalControlVisit[];
  /** Samples not yet synced to server */
  pendingGpsSamples: GpsSample[];
  /** Control visits not yet synced to server */
  pendingControlVisits: LocalControlVisit[];
  lastSyncedAt: string | null;
}

export interface LocalControlVisit {
  controlId: string;
  controlSequence: number;
  confirmedAt: string;
  method: ConfirmationMethod;
  latitude: number;
  longitude: number;
}

/** Connection status for offline handling */
export type ConnectionStatus = "online" | "offline" | "syncing";

/** Sync status messages (Indonesian) */
export const SYNC_MESSAGES: Record<ConnectionStatus, string> = {
  online: "Online",
  offline: "Offline — data disimpan di perangkat",
  syncing: "Menunggu sinkronisasi",
};
