/**
 * GpsService — handles real-time Geolocation tracking from browser API.
 * Preserves raw GPS data (latitude, longitude, altitude, accuracy, speed, heading, timestamp).
 * Docs: docs/07-GPS-TRACKING.md
 */

import type { GpsSample, GpsPermissionStatus } from "@/types/training";

export class GpsService {
  private watchId: number | null = null;
  private onSampleCallback: ((sample: GpsSample) => void) | null = null;
  private onErrorCallback: ((error: GeolocationPositionError) => void) | null = null;

  /** Check current GPS permission status */
  static async checkPermission(): Promise<GpsPermissionStatus> {
    if (typeof window === "undefined" || !("navigator" in window) || !("geolocation" in navigator)) {
      return "unavailable";
    }

    if ("permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        return result.state as GpsPermissionStatus;
      } catch {
        return "prompt";
      }
    }
    return "prompt";
  }

  /** Start recording active GPS position samples */
  startTracking(
    onSample: (sample: GpsSample) => void,
    onError?: (error: GeolocationPositionError) => void
  ) {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    this.onSampleCallback = onSample;
    this.onErrorCallback = onError || null;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const sample: GpsSample = {
          timestamp: pos.timestamp || Date.now(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        };
        this.onSampleCallback?.(sample);
      },
      (err) => {
        this.onErrorCallback?.(err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }

  /** Stop tracking */
  stopTracking() {
    if (this.watchId !== null && typeof window !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
