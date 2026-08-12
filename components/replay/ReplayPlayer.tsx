"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type maplibregl from "maplibre-gl";
import { ReplayEngine } from "@/features/replay/ReplayEngine";
import { formatDuration } from "@/lib/geo";
import type { GpsTrack, ControlVisit, CourseControl } from "@/types/database";
import type { PlaybackSpeed, ReplayEvent } from "@/types/analysis";
import type { LatLng } from "@/types/map";

interface ReplayPlayerProps {
  map: maplibregl.Map | null;
  tracks: GpsTrack[];
  visits: ControlVisit[];
  controls: CourseControl[];
}

export function ReplayPlayer({ map, tracks, visits, controls }: ReplayPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [followCamera, setFollowCamera] = useState(true);

  const startTimeMs = tracks.length > 0 ? new Date(tracks[0].recorded_at).getTime() : 0;
  const endTimeMs = tracks.length > 0 ? new Date(tracks[tracks.length - 1].recorded_at).getTime() : 0;
  const totalDurationMs = Math.max(1, endTimeMs - startTimeMs);

  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Initialize currentTimeMs
  useEffect(() => {
    if (startTimeMs > 0 && currentTimeMs === 0) {
      setCurrentTimeMs(startTimeMs);
    }
  }, [startTimeMs, currentTimeMs]);

  // Main animation loop
  const stepAnimation = useCallback(
    (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaRealMs = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      setCurrentTimeMs((prev) => {
        const next = prev + deltaRealMs * speed;
        if (next >= endTimeMs) {
          setIsPlaying(false);
          return endTimeMs;
        }
        return next;
      });

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(stepAnimation);
      }
    },
    [speed, endTimeMs, isPlaying]
  );

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(stepAnimation);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, stepAnimation]);

  // Render athlete position marker & trail line on MapLibre map
  useEffect(() => {
    if (!map || tracks.length === 0 || currentTimeMs === 0) return;

    const athletePos = ReplayEngine.getPositionAtTime(tracks, currentTimeMs);
    if (!athletePos) return;

    const sourceId = "replay-athlete-source";
    const trailSourceId = "replay-trail-source";
    const markerLayerId = "replay-athlete-marker";
    const trailLayerId = "replay-trail-line";

    // 1. Trail coordinates up to currentTimeMs
    const trailCoords = tracks
      .filter((t) => new Date(t.recorded_at).getTime() <= currentTimeMs)
      .map((t) => [t.point.coordinates[0], t.point.coordinates[1]]);

    if (trailCoords.length > 0) {
      trailCoords.push([athletePos.lng, athletePos.lat]);
    }

    // Update or add Trail source/layer
    if (map.getSource(trailSourceId)) {
      (map.getSource(trailSourceId) as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: trailCoords },
        properties: {},
      });
    } else {
      map.addSource(trailSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: trailCoords },
          properties: {},
        },
      });

      map.addLayer({
        id: trailLayerId,
        type: "line",
        source: trailSourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });
    }

    // Update or add Athlete Marker source/layer
    const athleteGeojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [athletePos.lng, athletePos.lat] },
          properties: {},
        },
      ],
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(athleteGeojson);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: athleteGeojson,
      });

      map.addLayer({
        id: markerLayerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 9,
          "circle-color": "#22c55e",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    // Follow camera
    if (followCamera) {
      map.easeTo({ center: [athletePos.lng, athletePos.lat], duration: 100 });
    }
  }, [map, tracks, currentTimeMs, followCamera]);

  const elapsedSec = Math.floor(Math.max(0, currentTimeMs - startTimeMs) / 1000);
  const totalSec = Math.floor(totalDurationMs / 1000);
  const events = ReplayEngine.buildEvents(tracks, visits);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 70,
        padding: "var(--space-4)",
        backgroundColor: "rgba(10, 14, 23, 0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
      }}
    >
      {/* Time & Follow Camera Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-2)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {formatDuration(elapsedSec)} / {formatDuration(totalSec)}
        </div>

        <button
          className={`btn btn-sm ${followCamera ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFollowCamera(!followCamera)}
        >
          📷 Kamera Ikuti: {followCamera ? "ON" : "OFF"}
        </button>
      </div>

      {/* Timeline Seek Slider */}
      <input
        type="range"
        min={startTimeMs}
        max={endTimeMs}
        value={currentTimeMs}
        onChange={(e) => {
          setIsPlaying(false);
          setCurrentTimeMs(Number(e.target.value));
        }}
        style={{ width: "100%", marginBottom: "var(--space-3)", accentColor: "var(--color-accent)" }}
      />

      {/* Play Controls & Speed Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ flex: 1, height: 48 }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Putar"}
        </button>

        {/* Speed Selector */}
        <div className="segmented" style={{ flex: 2 }}>
          {([0.5, 1, 2, 4, 8] as PlaybackSpeed[]).map((s) => (
            <button
              key={s}
              type="button"
              className="segmented-item"
              data-active={speed === s}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
