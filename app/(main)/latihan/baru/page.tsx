"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { CourseLayer } from "@/components/map/CourseLayer";
import { MapAreaService } from "@/features/maps/MapAreaService";
import { CourseGenerator } from "@/features/courses/generator/CourseGenerator";
import { CourseService } from "@/features/courses/CourseService";
import { DIFFICULTY_CONFIGS } from "@/types/course";
import { formatDistance } from "@/lib/geo";
import type { MapArea, Difficulty } from "@/types/database";
import type { GeneratedCourse } from "@/types/course";
import type maplibregl from "maplibre-gl";

function BuatLatihanContent() {
  const searchParams = useSearchParams();
  const initialMapId = searchParams.get("mapId");

  const [maps, setMaps] = useState<MapArea[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>(initialMapId || "");
  const [selectedMap, setSelectedMap] = useState<MapArea | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [controlCount, setControlCount] = useState<number>(10);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // 1. Fetch maps on load
  useEffect(() => {
    async function loadMaps() {
      const list = await MapAreaService.listMapAreas();
      setMaps(list);
      if (list.length > 0 && !selectedMapId) {
        setSelectedMapId(list[0].id);
      }
      setLoading(false);
    }
    loadMaps();
  }, [selectedMapId]);

  // 2. Update selected map object
  useEffect(() => {
    if (!selectedMapId) return;
    const m = maps.find((x) => x.id === selectedMapId);
    if (m) setSelectedMap(m);
  }, [selectedMapId, maps]);

  // 3. Generate course whenever map, difficulty, or CP count changes
  useEffect(() => {
    if (!selectedMap || !selectedMap.boundary) return;

    const result = CourseGenerator.generate({
      boundary: selectedMap.boundary,
      difficulty,
      controlCount,
    });

    setGeneratedCourse(result);
  }, [selectedMap, difficulty, controlCount]);

  const handleStartTraining = async () => {
    if (!selectedMap || !generatedCourse) return;
    setSaving(true);

    const courseName = `Jalur ${selectedMap.name} (${DIFFICULTY_CONFIGS[difficulty].label})`;
    const result = await CourseService.saveCourse(
      selectedMap.id,
      courseName,
      generatedCourse
    );

    setSaving(false);

    if (result.course) {
      router.push(`/latihan/sesi/${result.course.id}`);
    }
  };

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const centerLatLng = selectedMap?.center
    ? { lat: selectedMap.center.coordinates[1], lng: selectedMap.center.coordinates[0] }
    : { lat: -6.2088, lng: 106.8456 };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <div
        className="page-header"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <h1 className="text-section">Konfigurasi Latihan</h1>
          <p className="text-helper">Pilih peta dan tingkat kesulitan</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          Batal
        </button>
      </div>

      {/* Map Preview */}
      <div style={{ flex: 1, position: "relative" }}>
        {selectedMap && (
          <MapView
            initialCenter={centerLatLng}
            initialZoom={15}
            onMapReady={setMapInstance}
          >
            {generatedCourse && (
              <CourseLayer map={mapInstance} controls={generatedCourse.controls} />
            )}
          </MapView>
        )}

        {/* Floating Configuration Panel */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            padding: "var(--space-4)",
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
          }}
        >
          {/* Map Selector */}
          <div style={{ marginBottom: "var(--space-3)" }}>
            <label className="text-label" style={{ display: "block", marginBottom: "var(--space-1)" }}>
              Peta Area
            </label>
            {maps.length === 0 ? (
              <p className="text-helper">Belum ada peta. Buat peta terlebih dahulu di Peta Saya.</p>
            ) : (
              <select
                className="input"
                value={selectedMapId}
                onChange={(e) => setSelectedMapId(e.target.value)}
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Difficulty Segmented Control */}
          <div style={{ marginBottom: "var(--space-3)" }}>
            <label className="text-label" style={{ display: "block", marginBottom: "var(--space-1)" }}>
              Kesulitan
            </label>
            <div className="segmented">
              {(["easy", "medium", "hard", "very_hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="segmented-item"
                  data-active={difficulty === d}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFICULTY_CONFIGS[d].label}
                </button>
              ))}
            </div>
          </div>

          {/* CP Count Slider */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
              <label className="text-label">Jumlah Pos (CP)</label>
              <span className="text-body" style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                {controlCount} CP
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              value={controlCount}
              onChange={(e) => setControlCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
            />
          </div>

          {/* Course Summary Metrics */}
          {generatedCourse && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "var(--space-3)",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-4)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <div>
                <span className="text-helper" style={{ display: "block" }}>Estimasi Jarak</span>
                <span style={{ fontWeight: 700 }}>
                  {formatDistance(generatedCourse.estimatedDistance_m)}
                </span>
              </div>
              <div>
                <span className="text-helper" style={{ display: "block" }}>Seed Reproduksi</span>
                <span style={{ fontFamily: "monospace" }}>#{generatedCourse.seed}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleStartTraining}
            disabled={saving || !selectedMap || !generatedCourse}
          >
            {saving ? <span className="spinner" /> : "Mulai Briefing & Sesi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuatLatihanPage() {
  return (
    <Suspense fallback={<div className="page flex-center"><div className="spinner" /></div>}>
      <BuatLatihanContent />
    </Suspense>
  );
}
