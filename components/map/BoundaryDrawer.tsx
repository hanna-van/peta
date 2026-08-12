"use client";

import { useEffect, useState, useCallback } from "react";
import type maplibregl from "maplibre-gl";
import type { LatLng } from "@/types/map";

interface BoundaryDrawerProps {
  map: maplibregl.Map | null;
  active: boolean;
  onBoundaryChange: (polygon: GeoJSON.Polygon | null) => void;
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
 * BoundaryDrawer — allows drawing/selecting a polygon boundary on the map
 * by clicking points outdoors or on small touchscreens.
 */
export function BoundaryDrawer({
  map,
  active,
  onBoundaryChange,
}: BoundaryDrawerProps) {
  const [points, setPoints] = useState<LatLng[]>([]);

  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!active) return;

      const newPoint: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setPoints((prev) => {
        const next = [...prev, newPoint];
        if (next.length >= 3) {
          // Construct closed polygon
          const coords = [...next, next[0]].map((p) => [p.lng, p.lat]);
          onBoundaryChange({
            type: "Polygon",
            coordinates: [coords],
          });
        } else {
          onBoundaryChange(null);
        }
        return next;
      });
    },
    [active, onBoundaryChange]
  );

  // Map click listener
  useEffect(() => {
    if (!map || !active) return;
    map.on("click", handleMapClick);
    try {
      if (map.getCanvas()) map.getCanvas().style.cursor = "crosshair";
    } catch {
      // Ignore canvas error
    }

    return () => {
      map.off("click", handleMapClick);
      try {
        if (map.getCanvas()) map.getCanvas().style.cursor = "";
      } catch {
        // Ignore canvas error
      }
    };
  }, [map, active, handleMapClick]);

  // Render polygon & points layer on map
  useEffect(() => {
    if (!map || !safeIsStyleLoaded(map)) return;

    const sourceId = "boundary-drawer-source";
    const lineLayerId = "boundary-drawer-line";
    const fillLayerId = "boundary-drawer-fill";
    const pointsLayerId = "boundary-drawer-points";

    try {
      safeRemoveLayer(map, pointsLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveLayer(map, fillLayerId);
      safeRemoveSource(map, sourceId);

      if (points.length === 0) return;

      const lineCoords = points.map((p) => [p.lng, p.lat]);
      if (points.length >= 3) {
        lineCoords.push([points[0].lng, points[0].lat]);
      }

      const mainGeometry: GeoJSON.Geometry =
        points.length >= 3
          ? { type: "Polygon", coordinates: [lineCoords] }
          : { type: "LineString", coordinates: lineCoords };

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: mainGeometry,
            properties: {},
          },
          ...points.map((p) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [p.lng, p.lat],
            },
            properties: {},
          })),
        ],
      };

      map.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      if (points.length >= 3) {
        map.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.2,
          },
        });
      }

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        filter: ["!=", ["geometry-type"], "Point"],
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-dasharray": [2, 1],
        },
      });

      map.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    } catch {
      // Ignore transient style initialization error
    }

    return () => {
      if (!map) return;
      safeRemoveLayer(map, pointsLayerId);
      safeRemoveLayer(map, lineLayerId);
      safeRemoveLayer(map, fillLayerId);
      safeRemoveSource(map, sourceId);
    };
  }, [map, points]);

  const reset = () => {
    setPoints([]);
    onBoundaryChange(null);
  };

  if (!active) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "var(--space-4)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-4)",
        backgroundColor: "rgba(10, 14, 23, 0.9)",
        backdropFilter: "blur(8px)",
        borderRadius: "var(--radius-full)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <span>
        {points.length === 0
          ? "Ketuk pada peta untuk menandai sudut area (min. 3 titik)"
          : `Sudut ditandai: ${points.length} ${points.length < 3 ? "(butuh min. 3)" : ""}`}
      </span>
      {points.length > 0 && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={reset}
          style={{ color: "var(--color-error)", padding: "0 var(--space-2)" }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
