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

  private lastValidSample: GpsSample | null = null;

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
    this.lastValidSample = null;

    this.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const timestamp = pos.timestamp || Date.now();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        // Anti-Glitch Filter (Kalman/Speed validation)
        let isValid = true;
        if (this.lastValidSample) {
          const timeDiffSec = (timestamp - this.lastValidSample.timestamp) / 1000;
          if (timeDiffSec > 0) {
            // Lazy load turf to avoid bundle bloat in critical path if possible, but for simplicity here:
            const { distance, point } = await import("@turf/turf");
            const p1 = point([this.lastValidSample.longitude, this.lastValidSample.latitude]);
            const p2 = point([lng, lat]);
            const distMeters = distance(p1, p2, { units: "meters" });
            
            const calculatedSpeed = distMeters / timeDiffSec;
            // Max human sprint is ~12 m/s (Usain Bolt is 10.4 m/s). 
            // If jump > 12m/s, it's likely a GPS glitch bouncing off a building/hill.
            if (calculatedSpeed > 12) {
              console.warn(`[GpsService] GPS Glitch Detected! Speed: ${calculatedSpeed.toFixed(1)} m/s. Discarding point.`);
              isValid = false;
            }
          }
        }

        if (isValid) {
          const sample: GpsSample = {
            timestamp,
            latitude: lat,
            longitude: lng,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          };
          this.lastValidSample = sample;
          this.onSampleCallback?.(sample);
        }
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
