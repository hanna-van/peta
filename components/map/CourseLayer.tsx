"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import type { GeneratedControl } from "@/types/course";

interface CourseLayerProps {
  map: maplibregl.Map | null;
  controls: GeneratedControl[];
  activeControlSequence?: number;
}

function safeIsStyleLoaded(map: maplibregl.Map): boolean {
  try {
    if (!map || !(map as unknown as { style?: unknown }).style) return false;
    return Boolean(map.isStyleLoaded());
  } catch {
    return false;
  }
}

function safeHasLayer(map: maplibregl.Map, id: string): boolean {
  try {
    if (!safeIsStyleLoaded(map)) return false;
    return Boolean(map.getLayer(id));
  } catch {
    return false;
  }
}

function safeHasSource(map: maplibregl.Map, id: string): boolean {
  try {
    if (!safeIsStyleLoaded(map)) return false;
    return Boolean(map.getSource(id));
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
    if (!map || controls.length === 0 || !safeIsStyleLoaded(map)) return;

    const sourceId = "course-overlay-source";
    const lineLayerId = "course-line-layer";
    const circleLayerId = "course-circle-layer";
    const activeCircleLayerId = "course-active-circle-layer";
    const labelLayerId = "course-label-layer";

    try {
      safeRemoveLayer(map, labelLayerId);
      safeRemoveLayer(map, activeCircleLayerId);
      safeRemoveLayer(map, circleLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveSource(map, sourceId);

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
          "line-color": "#c084fc",
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
            "#f59e0b",
            "#c084fc",
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
          "text-offset": [1.2, -1.2],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#0a0e17",
          "text-halo-width": 2,
        },
      });
    } catch {
      // Ignore transient style initialization error
    }

    return () => {
      if (!map) return;
      safeRemoveLayer(map, labelLayerId);
      safeRemoveLayer(map, activeCircleLayerId);
      safeRemoveLayer(map, circleLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveSource(map, sourceId);
    };
  }, [map, controls, activeControlSequence]);

  return null;
}
