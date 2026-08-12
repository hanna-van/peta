"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import type { MapFeature } from "@/types/database";

interface FeatureLayerProps {
  map: maplibregl.Map | null;
  features: MapFeature[];
}

function safeHasLayer(map: maplibregl.Map, id: string): boolean {
  try {
    return Boolean(map.isStyleLoaded() && map.getStyle() && map.getLayer(id));
  } catch {
    return false;
  }
}

function safeHasSource(map: maplibregl.Map, id: string): boolean {
  try {
    return Boolean(map.isStyleLoaded() && map.getStyle() && map.getSource(id));
  } catch {
    return false;
  }
}

function safeRemoveLayer(map: maplibregl.Map, id: string) {
  try {
    if (safeHasLayer(map, id)) map.removeLayer(id);
  } catch {
    // Ignore cleanup error
  }
}

function safeRemoveSource(map: maplibregl.Map, id: string) {
  try {
    if (safeHasSource(map, id)) map.removeSource(id);
  } catch {
    // Ignore cleanup error
  }
}

/**
 * FeatureLayer — renders map features on the MapLibre canvas
 * using styled vector layers.
 */
export function FeatureLayer({ map, features }: FeatureLayerProps) {
  useEffect(() => {
    if (!map || features.length === 0 || !map.isStyleLoaded() || !map.getStyle()) return;

    const sourceId = "map-features-source";
    const lineLayerId = "map-features-line";
    const polyLayerId = "map-features-polygon";
    const pointLayerId = "map-features-point";

    try {
      safeRemoveLayer(map, lineLayerId);
      safeRemoveLayer(map, polyLayerId);
      safeRemoveLayer(map, pointLayerId);
      safeRemoveSource(map, sourceId);

      const featureCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: features.map((f) => ({
          type: "Feature",
          geometry: f.geometry,
          properties: {
            id: f.id,
            featureType: f.feature_type,
            ...f.properties,
          },
        })),
      };

      map.addSource(sourceId, {
        type: "geojson",
        data: featureCollection,
      });

      // 1. Polygon layer
      map.addLayer({
        id: polyLayerId,
        type: "fill",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": [
            "match",
            ["get", "featureType"],
            "building",
            "#475569",
            "water",
            "#0284c7",
            "vegetation",
            "#15803d",
            "open_area",
            "#eab308",
            "#334155",
          ],
          "fill-opacity": 0.35,
        },
      });

      // 2. Line layer
      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": [
            "match",
            ["get", "featureType"],
            "trail",
            "#f97316",
            "road",
            "#94a3b8",
            "fence",
            "#dc2626",
            "ditch",
            "#0284c7",
            "#64748b",
          ],
          "line-width": [
            "match",
            ["get", "featureType"],
            "trail",
            3,
            "road",
            4,
            "fence",
            2,
            2,
          ],
          "line-dasharray": [
            "match",
            ["get", "featureType"],
            "trail",
            ["literal", [2, 1]],
            "fence",
            ["literal", [3, 2]],
            ["literal", [1]],
          ],
        },
      });

      // 3. Point layer
      map.addLayer({
        id: pointLayerId,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "featureType"],
            "tree",
            "#22c55e",
            "boulder",
            "#94a3b8",
            "#3b82f6",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
    } catch {
      // Ignore transient style initialization error
    }

    return () => {
      if (!map) return;
      safeRemoveLayer(map, lineLayerId);
      safeRemoveLayer(map, polyLayerId);
      safeRemoveLayer(map, pointLayerId);
      safeRemoveSource(map, sourceId);
    };
  }, [map, features]);

  return null;
}
