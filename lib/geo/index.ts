/**
 * Geospatial utility functions.
 * Wraps Turf.js with typed interfaces.
 * Keeps geospatial logic out of React components.
 */

import * as turf from "@turf/turf";
import type { LatLng, BBox } from "@/types/map";

/** Calculate distance between two points in meters */
export function distanceMeters(a: LatLng, b: LatLng): number {
  return turf.distance(
    turf.point([a.lng, a.lat]),
    turf.point([b.lng, b.lat]),
    { units: "meters" }
  );
}

/** Calculate bearing from point A to point B in degrees (0-360) */
export function bearing(from: LatLng, to: LatLng): number {
  const b = turf.bearing(
    turf.point([from.lng, from.lat]),
    turf.point([to.lng, to.lat])
  );
  return (b + 360) % 360;
}

/** Check if a point is inside a polygon boundary */
export function isInsideBoundary(
  point: LatLng,
  boundary: GeoJSON.Polygon
): boolean {
  return turf.booleanPointInPolygon(
    turf.point([point.lng, point.lat]),
    turf.polygon(boundary.coordinates)
  );
}

/** Calculate the center of a bounding box */
export function bboxCenter(bbox: BBox): LatLng {
  return {
    lat: (bbox[1] + bbox[3]) / 2,
    lng: (bbox[0] + bbox[2]) / 2,
  };
}

/** Calculate the area of a polygon in square meters */
export function polygonAreaM2(boundary: GeoJSON.Polygon): number {
  return turf.area(turf.polygon(boundary.coordinates));
}

/** Calculate the bounding box of a polygon */
export function polygonBBox(boundary: GeoJSON.Polygon): BBox {
  const bb = turf.bbox(turf.polygon(boundary.coordinates));
  return [bb[0], bb[1], bb[2], bb[3]];
}

/**
 * Calculate a destination point from a starting point, distance, and bearing.
 * Used by the course generator to place controls.
 */
export function destination(
  origin: LatLng,
  distanceM: number,
  bearingDeg: number
): LatLng {
  const dest = turf.destination(
    turf.point([origin.lng, origin.lat]),
    distanceM / 1000,
    bearingDeg,
    { units: "kilometers" }
  );
  return {
    lat: dest.geometry.coordinates[1],
    lng: dest.geometry.coordinates[0],
  };
}

/** Calculate the total distance of a route (array of points) in meters */
export function routeDistance(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceMeters(points[i - 1], points[i]);
  }
  return total;
}

/**
 * GPS plausibility check — detect impossible jumps.
 * Returns true if the movement between two samples is plausible.
 */
export function isPlausibleMovement(
  prev: { lat: number; lng: number; timestamp: number },
  curr: { lat: number; lng: number; timestamp: number },
  maxSpeedMps: number = 15 // ~54 km/h — generous for orienteering
): boolean {
  const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds
  if (dt <= 0) return false;

  const dist = distanceMeters(
    { lat: prev.lat, lng: prev.lng },
    { lat: curr.lat, lng: curr.lng }
  );

  const speed = dist / dt;
  return speed <= maxSpeedMps;
}

/** Format distance for display */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Format duration for display */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format elevation for display */
export function formatElevation(meters: number | null): string | null {
  if (meters === null) return null;
  return `${Math.round(meters)} m`;
}
