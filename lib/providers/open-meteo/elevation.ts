/**
 * Open-Meteo Elevation API provider.
 * Free, no API key required.
 * https://open-meteo.com/en/docs/elevation-api
 */

import type { ElevationProvider, LatLng } from "@/types/map";

const API_BASE = "https://api.open-meteo.com/v1/elevation";

export class OpenMeteoElevationProvider implements ElevationProvider {
  readonly id = "open-meteo";
  readonly name = "Open-Meteo Elevation";

  async getElevation(lat: number, lng: number): Promise<number | null> {
    const results = await this.getElevations([{ lat, lng }]);
    return results[0];
  }

  async getElevations(points: LatLng[]): Promise<(number | null)[]> {
    if (points.length === 0) return [];

    // Open-Meteo accepts comma-separated lat/lng arrays
    // Max ~100 points per request
    const batchSize = 100;
    const results: (number | null)[] = [];

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const lats = batch.map((p) => p.lat).join(",");
      const lngs = batch.map((p) => p.lng).join(",");

      try {
        const response = await fetch(
          `${API_BASE}?latitude=${lats}&longitude=${lngs}`
        );

        if (!response.ok) {
          results.push(...batch.map(() => null));
          continue;
        }

        const data = await response.json();
        if (data.elevation && Array.isArray(data.elevation)) {
          results.push(
            ...data.elevation.map((e: number) =>
              e !== undefined && e !== null ? e : null
            )
          );
        } else {
          results.push(...batch.map(() => null));
        }
      } catch {
        results.push(...batch.map(() => null));
      }
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE}?latitude=0&longitude=0`,
        { signal: AbortSignal.timeout(5000) }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
