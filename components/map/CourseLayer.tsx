"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { bbox, bboxPolygon, buffer, lineString } from "@turf/turf";
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

    const maskSourceId = "course-mask-source";
    const maskLayerId = "course-mask-layer";

    try {
      safeRemoveLayer(map, labelLayerId);
      safeRemoveLayer(map, "course-finish-inner-layer");
      safeRemoveLayer(map, activeCircleLayerId);
      safeRemoveLayer(map, circleLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveLayer(map, maskLayerId);
      safeRemoveSource(map, sourceId);
      safeRemoveSource(map, maskSourceId);

      const lineCoords = controls.map((c) => [c.position.lng, c.position.lat]);

      // --- 1. Map Masking (Paper Crop Effect) ---
      let maskFeature: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
      if (lineCoords.length > 1) {
        try {
          const line = lineString(lineCoords);
          const bbx = bbox(line);
          const poly = bboxPolygon(bbx);
          const bufferedPoly = buffer(poly, 0.2, { units: "kilometers" }); // 200m buffer
          
          if (bufferedPoly && bufferedPoly.geometry && bufferedPoly.geometry.coordinates) {
            const holeRing = bufferedPoly.geometry.coordinates[0];
            // Donut polygon: world exterior ring + course interior ring (hole)
            maskFeature = {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-180, -90],
                    [180, -90],
                    [180, 90],
                    [-180, 90],
                    [-180, -90],
                  ],
                  holeRing,
                ],
              },
            };
          }
        } catch (e) {
          console.warn("Failed to generate mask", e);
        }
      }

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
                  ? "▲"
                  : c.sequence === controls.length - 1
                    ? ""
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

      const iofMagenta = "#D400D4";
      const iofMagentaActive = "#00FFFF"; // High-contrast glowing cyan for active CP
      const iofMagentaFill = "rgba(212, 0, 212, 0.15)";
      const activeFill = "rgba(0, 255, 255, 0.25)";

      // --- Mask Layer (Drawn first, so it's at the bottom) ---
      if (maskFeature) {
        map.addSource(maskSourceId, {
          type: "geojson",
          data: maskFeature,
        });

        map.addLayer({
          id: maskLayerId,
          type: "fill",
          source: maskSourceId,
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": 0.95, // Highly opaque white like paper
          },
        });
      }

      // Course Line
      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": iofMagenta,
          "line-width": 3,
          "line-opacity": 0.6,
        },
      });

      // Control Outer Circles
      map.addLayer({
        id: circleLayerId,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": [
            "case",
            ["get", "isStart"],
            0,
            ["get", "isFinish"],
            18,
            16,
          ],
          "circle-color": [
            "case",
            ["get", "isStart"],
            "transparent",
            ["get", "isActive"],
            activeFill,
            iofMagentaFill,
          ],
          "circle-stroke-width": 4,
          "circle-stroke-color": [
            "case",
            ["get", "isActive"],
            iofMagentaActive,
            iofMagenta,
          ],
          "circle-stroke-opacity": [
            "case",
            ["get", "isStart"],
            0,
            1,
          ],
        },
      });

      // Finish Inner Circle (Double Circle)
      map.addLayer({
        id: "course-finish-inner-layer",
        type: "circle",
        source: sourceId,
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "isFinish"], true]],
        paint: {
          "circle-radius": 10,
          "circle-color": iofMagentaFill,
          "circle-stroke-width": 4,
          "circle-stroke-color": iofMagenta,
        },
      });

      // Sequence Labels & Start Triangle
      map.addLayer({
        id: labelLayerId,
        type: "symbol",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        layout: {
          "text-field": ["get", "label"],
          "text-size": [
            "case",
            ["get", "isStart"],
            42, // Large triangle
            24, // Normal numbers
          ],
          "text-font": ["Metropolis Bold", "Noto Sans Bold"],
          "text-offset": [
            "case",
            ["get", "isStart"],
            ["literal", [0, -0.15]], // Center the triangle
            ["literal", [1.1, -1.1]], // Offset the numbers tighter
          ],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": [
            "case",
            ["get", "isActive"],
            iofMagentaActive,
            iofMagenta,
          ],
          "text-halo-color": "#ffffff",
          "text-halo-width": [
            "case",
            ["get", "isStart"],
            0, // No halo for start triangle
            3, // Thick white halo for numbers
          ],
        },
      });
    } catch {
      // Ignore transient style initialization error
    }

    return () => {
      if (!map) return;
      safeRemoveLayer(map, labelLayerId);
      safeRemoveLayer(map, "course-finish-inner-layer");
      safeRemoveLayer(map, activeCircleLayerId);
      safeRemoveLayer(map, circleLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveSource(map, sourceId);
    };
  }, [map, controls, activeControlSequence]);

  return null;
}
