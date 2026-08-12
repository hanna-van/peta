/**
 * IpLocationProvider — fetches IP-based location fallback using IPInfo API.
 * Useful for initial map centering before GPS lock or when GPS is unpermitted.
 */

import type { LatLng } from "@/types/map";

export interface IpLocationResult {
  location: LatLng;
  city: string | null;
  region: string | null;
  country: string | null;
}

export class IpLocationProvider {
  /** Fetch current client location from IPInfo API */
  static async getCurrentLocation(): Promise<IpLocationResult | null> {
    const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;

    try {
      const url = token
        ? `https://ipinfo.io/json?token=${token}`
        : "https://ipinfo.io/json";

      const response = await fetch(url, {
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.loc) return null;

      const [latStr, lngStr] = data.loc.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isNaN(lat) || isNaN(lng)) return null;

      return {
        location: { lat, lng },
        city: data.city || null,
        region: data.region || null,
        country: data.country || null,
      };
    } catch {
      return null;
    }
  }
}
