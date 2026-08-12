/**
 * IpLocationProvider — fetches IP-based location fallback using server API proxy.
 * Prevents browser CORS blocks and protects API token.
 */

import type { LatLng } from "@/types/map";

export interface IpLocationResult {
  location: LatLng;
  city: string | null;
  region: string | null;
  country: string | null;
}

export class IpLocationProvider {
  /** Fetch current client location via server proxy */
  static async getCurrentLocation(): Promise<IpLocationResult | null> {
    try {
      const response = await fetch("/api/geolocation");
      if (!response.ok) return null;
      const data: IpLocationResult = await response.json();
      return data;
    } catch {
      return null;
    }
  }
}
