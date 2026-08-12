/**
 * Geospatial utility tests
 */

import { describe, it, expect } from "vitest";
import {
  distanceMeters,
  bearing,
  isPlausibleMovement,
  formatDistance,
  formatDuration,
  destination,
  routeDistance,
} from "./index";

describe("distanceMeters", () => {
  it("should calculate distance between two known points", () => {
    // Jakarta to Bandung ≈ 120km
    const d = distanceMeters(
      { lat: -6.2088, lng: 106.8456 },
      { lat: -6.9175, lng: 107.6191 }
    );
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(130000);
  });

  it("should return 0 for the same point", () => {
    const d = distanceMeters(
      { lat: -6.2088, lng: 106.8456 },
      { lat: -6.2088, lng: 106.8456 }
    );
    expect(d).toBe(0);
  });

  it("should handle short distances accurately", () => {
    // ~100m apart
    const d = distanceMeters(
      { lat: -6.2088, lng: 106.8456 },
      { lat: -6.2088, lng: 106.8468 }
    );
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(200);
  });
});

describe("bearing", () => {
  it("should return ~0 for due north", () => {
    const b = bearing(
      { lat: -6.2088, lng: 106.8456 },
      { lat: -6.1088, lng: 106.8456 }
    );
    expect(b).toBeCloseTo(0, 0);
  });

  it("should return ~90 for due east", () => {
    const b = bearing(
      { lat: -6.2088, lng: 106.8456 },
      { lat: -6.2088, lng: 106.9456 }
    );
    expect(b).toBeCloseTo(90, 0);
  });
});

describe("destination", () => {
  it("should place a point at the correct distance", () => {
    const origin = { lat: -6.2088, lng: 106.8456 };
    const dest = destination(origin, 1000, 0); // 1km north
    const d = distanceMeters(origin, dest);
    expect(d).toBeCloseTo(1000, -1); // within ~10m
  });
});

describe("routeDistance", () => {
  it("should sum distances across points", () => {
    const d = routeDistance([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      { lat: 0, lng: 0.02 },
    ]);
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2400);
  });

  it("should return 0 for fewer than 2 points", () => {
    expect(routeDistance([])).toBe(0);
    expect(routeDistance([{ lat: 0, lng: 0 }])).toBe(0);
  });
});

describe("isPlausibleMovement", () => {
  it("should accept normal walking speed", () => {
    expect(
      isPlausibleMovement(
        { lat: -6.2088, lng: 106.8456, timestamp: 0 },
        { lat: -6.2088, lng: 106.8458, timestamp: 10000 }, // ~22m in 10s = ~2.2 m/s
      )
    ).toBe(true);
  });

  it("should reject teleportation", () => {
    expect(
      isPlausibleMovement(
        { lat: -6.2088, lng: 106.8456, timestamp: 0 },
        { lat: -6.3, lng: 106.9, timestamp: 1000 }, // ~12km in 1s
      )
    ).toBe(false);
  });

  it("should reject zero time interval", () => {
    expect(
      isPlausibleMovement(
        { lat: -6.2088, lng: 106.8456, timestamp: 1000 },
        { lat: -6.2089, lng: 106.8457, timestamp: 1000 },
      )
    ).toBe(false);
  });
});

describe("formatDistance", () => {
  it("should format meters for short distances", () => {
    expect(formatDistance(150)).toBe("150 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("should format km for long distances", () => {
    expect(formatDistance(1500)).toBe("1.50 km");
    expect(formatDistance(12345)).toBe("12.35 km");
  });
});

describe("formatDuration", () => {
  it("should format minutes and seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("should handle zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});
