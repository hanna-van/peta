"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type maplibregl from "maplibre-gl";
import { ReplayEngine } from "@/features/replay/ReplayEngine";
import { formatDuration } from "@/lib/geo";
import { distance, point } from "@turf/turf";
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
  const [telemetry, setTelemetry] = useState({ distanceKm: 0, paceStr: "--:--" });

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

    const filteredTracks = tracks.filter((t) => new Date(t.recorded_at).getTime() <= currentTimeMs);
    const trailFeatures: GeoJSON.Feature[] = [];
    let distKm = 0;
    let currentMps = 0;

    for (let i = 0; i < filteredTracks.length - 1; i++) {
      const p1 = filteredTracks[i];
      const p2 = filteredTracks[i + 1];
      
      const speed = p2.speed_mps ?? p1.speed_mps ?? 0;
      currentMps = speed;
      let color = "#ef4444"; // Merah (lambat/bingung, < 1 m/s)
      if (speed > 2.5) color = "#3b82f6"; // Biru (cepat, > 2.5 m/s)
      else if (speed > 1) color = "#f59e0b"; // Kuning (sedang)

      trailFeatures.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [p1.point.coordinates[0], p1.point.coordinates[1]],
            [p2.point.coordinates[0], p2.point.coordinates[1]]
          ]
        },
        properties: { color }
      });
      
      distKm += distance(p1.point, p2.point, { units: "kilometers" });
    }

    if (filteredTracks.length > 0) {
      const last = filteredTracks[filteredTracks.length - 1];
      const speed = currentMps || 2;
      trailFeatures.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [last.point.coordinates[0], last.point.coordinates[1]],
            [athletePos.lng, athletePos.lat]
          ]
        },
        properties: { color: speed > 2.5 ? "#3b82f6" : speed > 1 ? "#f59e0b" : "#ef4444" }
      });
      
      distKm += distance(last.point, point([athletePos.lng, athletePos.lat]), { units: "kilometers" });
    }
    
    // Calculate Pace (min/km)
    let paceStr = "--:--";
    if (currentMps > 0.1) {
      const speedKmh = currentMps * 3.6;
      const paceDec = 60 / speedKmh;
      const paceMin = Math.floor(paceDec);
      const paceSec = Math.floor((paceDec - paceMin) * 60).toString().padStart(2, "0");
      if (paceMin < 60) paceStr = `${paceMin}:${paceSec}`;
    }
    setTelemetry({ distanceKm: distKm, paceStr });

    // Update or add Trail source/layer
    const trailGeojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: trailFeatures,
    };

    if (map.getSource(trailSourceId)) {
      (map.getSource(trailSourceId) as maplibregl.GeoJSONSource).setData(trailGeojson);
    } else {
      map.addSource(trailSourceId, {
        type: "geojson",
        data: trailGeojson,
      });

      map.addLayer({
        id: trailLayerId,
        type: "line",
        source: trailSourceId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 5,
          "line-opacity": 0.9,
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
      {/* Telemetry HUD Dashboard */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-4)",
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="text-helper">WAKTU</div>
          <div className="text-section text-metric" style={{ fontSize: "1.25rem" }}>
            {formatDuration(elapsedSec)}
          </div>
        </div>
        <div style={{ width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.1)" }}></div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="text-helper">JARAK</div>
          <div className="text-section text-metric" style={{ fontSize: "1.25rem" }}>
            {telemetry.distanceKm.toFixed(2)} <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>km</span>
          </div>
        </div>
        <div style={{ width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.1)" }}></div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="text-helper">PACE SAAT INI</div>
          <div className="text-section text-metric" style={{ fontSize: "1.25rem" }}>
            {telemetry.paceStr} <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>/km</span>
          </div>
        </div>
      </div>

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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#ef4444" }}></div>
          <span style={{ marginRight: 8 }}>Lambat</span>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#3b82f6" }}></div>
          <span>Cepat</span>
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
