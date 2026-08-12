/**
 * TrainingStore — Local-first session manager & offline sync queue.
 * Docs: docs/14-OFFLINE-SYSTEM.md
 */

import { createClient } from "@/lib/supabase/client";
import type { LocalSessionState, GpsSample, LocalControlVisit, ConnectionStatus } from "@/types/training";
import type { SessionStatus } from "@/types/database";

const STORAGE_KEY = "orienteering_active_session";

export class TrainingStore {
  /** Load active session from local storage */
  static getLocalSession(): LocalSessionState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as LocalSessionState;
    } catch {
      return null;
    }
  }

  /** Save active session state locally */
  static saveLocalSession(state: LocalSessionState) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to persist session locally:", err);
    }
  }

  /** Clear local active session when finished */
  static clearLocalSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Initialize a new local training session */
  static initSession(sessionId: string, courseId: string): LocalSessionState {
    const state: LocalSessionState = {
      sessionId,
      courseId,
      status: "ready",
      startedAt: null,
      gpsSamples: [],
      controlVisits: [],
      pendingGpsSamples: [],
      pendingControlVisits: [],
      lastSyncedAt: null,
    };
    this.saveLocalSession(state);
    return state;
  }

  /** Sync pending local samples to Supabase */
  static async syncPendingData(state: LocalSessionState): Promise<{
    updatedState: LocalSessionState;
    connectionStatus: ConnectionStatus;
  }> {
    if (typeof window === "undefined" || !navigator.onLine) {
      return { updatedState: state, connectionStatus: "offline" };
    }

    if (state.pendingGpsSamples.length === 0 && state.pendingControlVisits.length === 0) {
      return { updatedState: state, connectionStatus: "online" };
    }

    try {
      const supabase = createClient();

      // 1. Sync pending GPS tracks
      if (state.pendingGpsSamples.length > 0) {
        const records = state.pendingGpsSamples.map((s) => ({
          session_id: state.sessionId,
          recorded_at: new Date(s.timestamp).toISOString(),
          point: {
            type: "Point",
            coordinates: [s.longitude, s.latitude],
          },
          altitude_m: s.altitude,
          accuracy_m: s.accuracy,
          speed_mps: s.speed,
          heading_deg: s.heading,
        }));

        const { error } = await supabase.from("gps_tracks").insert(records);
        if (!error) {
          state.pendingGpsSamples = [];
        }
      }

      // 2. Sync pending Control visits
      if (state.pendingControlVisits.length > 0) {
        const visits = state.pendingControlVisits.map((v) => ({
          session_id: state.sessionId,
          control_id: v.controlId,
          confirmed_at: v.confirmedAt,
          confirmation_method: v.method,
          position: {
            type: "Point",
            coordinates: [v.longitude, v.latitude],
          },
        }));

        const { error } = await supabase.from("control_visits").insert(visits);
        if (!error) {
          state.pendingControlVisits = [];
        }
      }

      state.lastSyncedAt = new Date().toISOString();
      this.saveLocalSession(state);

      return { updatedState: state, connectionStatus: "online" };
    } catch {
      return { updatedState: state, connectionStatus: "offline" };
    }
  }

  /** Update session status on Supabase */
  static async updateRemoteSessionStatus(
    sessionId: string,
    status: SessionStatus,
    extra?: { duration_seconds?: number; distance_m?: number; finished_at?: string; started_at?: string }
  ) {
    try {
      const supabase = createClient();
      await supabase
        .from("training_sessions")
        .update({
          status,
          ...(extra || {}),
        })
        .eq("id", sessionId);
    } catch {
      // Ignore network failures — stored locally
    }
  }
}
