"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import type { MapFeature } from "@/types/database";

interface FeatureLayerProps {
  map: maplibregl.Map | null;
  features: MapFeature[];
}

/**
 * FeatureLayer — renders map features on the MapLibre canvas
 * using styled vector layers.
 */
export function FeatureLayer({ map, features }: FeatureLayerProps) {
  useEffect(() => {
    if (!map || features.length === 0) return;

    const sourceId = "map-features-source";
    const lineLayerId = "map-features-line";
    const polyLayerId = "map-features-polygon";
    const pointLayerId = "map-features-point";

    // Clean up existing layers/sources if re-rendering
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getLayer(polyLayerId)) map.removeLayer(polyLayerId);
    if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

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

    // 1. Polygon layer (buildings, water, open area, forest)
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
          "#334155", // default
        ],
        "fill-opacity": 0.35,
      },
    });

    // 2. Line layer (trails, roads, fences, ditches)
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

    // 3. Point layer (trees, boulders)
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

    return () => {
      if (!map) return;
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(polyLayerId)) map.removeLayer(polyLayerId);
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, features]);

  return null;
}
