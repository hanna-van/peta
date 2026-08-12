"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import type { GeneratedControl } from "@/types/course";

interface CourseLayerProps {
  map: maplibregl.Map | null;
  controls: GeneratedControl[];
  activeControlSequence?: number;
}

/**
 * CourseLayer — renders official orienteering course symbols on MapLibre map:
 * - Start (Purple Triangle)
 * - Controls (Purple Circle + Sequence Number label)
 * - Finish (Double Purple Circle)
 * - Course line connecting controls
 */
export function CourseLayer({
  map,
  controls,
  activeControlSequence,
}: CourseLayerProps) {
  useEffect(() => {
    if (!map || controls.length === 0) return;

    const sourceId = "course-overlay-source";
    const lineLayerId = "course-line-layer";
    const circleLayerId = "course-circle-layer";
    const activeCircleLayerId = "course-active-circle-layer";
    const labelLayerId = "course-label-layer";

    // Clean up old layers/sources
    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(activeCircleLayerId)) map.removeLayer(activeCircleLayerId);
    if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // 1. Line connecting controls (Start -> CP1 -> CP2 -> ... -> Finish)
    const lineCoords = controls.map((c) => [c.position.lng, c.position.lat]);

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: lineCoords,
          },
          properties: { type: "course_line" },
        },
        ...controls.map((c) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [c.position.lng, c.position.lat],
          },
          properties: {
            sequence: c.sequence,
            label:
              c.sequence === 0
                ? "S"
                : c.sequence === controls.length - 1
                  ? "F"
                  : String(c.sequence),
            isStart: c.sequence === 0,
            isFinish: c.sequence === controls.length - 1,
            isActive: activeControlSequence === c.sequence,
          },
        })),
      ],
    };

    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
    });

    // Course Line
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": "#c084fc", // Purple/Magenta (Orienteering standard)
        "line-width": 3.5,
        "line-opacity": 0.9,
      },
    });

    // Control Circles
    map.addLayer({
      id: circleLayerId,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": [
          "case",
          ["get", "isStart"],
          10,
          ["get", "isFinish"],
          14,
          12,
        ],
        "circle-color": "transparent",
        "circle-stroke-width": [
          "case",
          ["get", "isFinish"],
          4,
          3,
        ],
        "circle-stroke-color": [
          "case",
          ["get", "isActive"],
          "#f59e0b", // Amber for next CP
          "#c084fc", // Purple
        ],
      },
    });

    // Sequence Labels
    map.addLayer({
      id: labelLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 14,
        "text-font": ["Metropolis Bold", "Noto Sans Bold"],
        "text-offset": [1.2, -1.2], // Offset so text doesn't obscure CP center
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#0a0e17",
        "text-halo-width": 2,
      },
    });

    return () => {
      if (!map) return;
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(activeCircleLayerId)) map.removeLayer(activeCircleLayerId);
      if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, controls, activeControlSequence]);

  return null;
}
