"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { BoundaryDrawer } from "@/components/map/BoundaryDrawer";
import { MapAreaService } from "@/features/maps/MapAreaService";
import type maplibregl from "maplibre-gl";

export default function TambahPetaContent() {
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [terrainType, setTerrainType] = useState("urban");
  const [runnability, setRunnability] = useState("high");
  const [boundary, setBoundary] = useState<GeoJSON.Polygon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUseCurrentView = () => {
    if (!mapInstance) return;
    const bounds = mapInstance.getBounds();
    const west = bounds.getWest();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const north = bounds.getNorth();

    const poly: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
          [west, north],
        ],
      ],
    };
    setBoundary(poly);

    if (!name.trim()) {
      setName("Area Latihan Baru");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boundary) {
      setError("Tentukan batas area latihan di peta terlebih dahulu.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await MapAreaService.createMapArea({
      name: name.trim() || "Area Latihan",
      description,
      boundary,
      sourceType: "osm",
      metadata: {
        terrainType,
        runnability,
      },
    });

    setSaving(false);

    if (result.error || !result.mapArea) {
      setError(result.error || "Gagal membuat peta.");
    } else {
      router.push(`/peta/${result.mapArea.id}`);
    }
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <div
        className="page-header"
        style={{
          zIndex: 70,
          backgroundColor: "var(--color-bg-secondary)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <h1 className="text-section">Tambah Area Peta</h1>
          <p className="text-helper">Tentukan nama dan batas area di peta</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          Batal
        </button>
      </div>

      {/* Main Map View */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          onMapReady={setMapInstance}
          showUserLocation
          fullscreen={false}
          className="h-full"
        >
          <BoundaryDrawer
            map={mapInstance}
            active={true}
            onBoundaryChange={setBoundary}
          />
        </MapView>

        {/* Quick Select Button */}
        <div
          style={{
            position: "absolute",
            top: "var(--space-16)",
            right: "var(--space-4)",
            zIndex: 60,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleUseCurrentView}
            style={{
              boxShadow: "var(--shadow-md)",
              backgroundColor: "rgba(17, 24, 39, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            ⚡ Gunakan Tampilan Peta Ini
          </button>
        </div>

        {/* Bottom Form Floating Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            pointerEvents: "auto",
            padding: "var(--space-4)",
            backgroundColor: "rgba(17, 24, 39, 0.98)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
          }}
        >
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <input
                type="text"
                className="input"
                placeholder="Nama Area (cth: Hutan Kota Babakan Siliwangi)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ zIndex: 110, position: "relative" }}
              />
            </div>

            <div style={{ marginBottom: "var(--space-3)" }}>
              <input
                type="text"
                className="input"
                placeholder="Keterangan singkat (opsional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ zIndex: 110, position: "relative" }}
              />
            </div>

            <div style={{ marginBottom: "var(--space-3)", display: "flex", gap: "var(--space-2)" }}>
              <select
                className="input"
                value={terrainType}
                onChange={(e) => setTerrainType(e.target.value)}
                style={{ zIndex: 110, position: "relative", flex: 1 }}
              >
                <option value="urban">Perkotaan / Kampus</option>
                <option value="park">Taman Kota</option>
                <option value="open_forest">Hutan Terbuka</option>
                <option value="dense_forest">Hutan Lebat</option>
              </select>

              <select
                className="input"
                value={runnability}
                onChange={(e) => setRunnability(e.target.value)}
                style={{ zIndex: 110, position: "relative", flex: 1 }}
              >
                <option value="high">Mudah Dilalui (Cepat)</option>
                <option value="medium">Menengah</option>
                <option value="low">Sulit / Semak Belukar</option>
              </select>
            </div>

            {error && (
              <div
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  marginBottom: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-error-subtle)",
                  color: "var(--color-error)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving || !boundary}
            >
              {saving ? (
                <>
                  <span className="spinner" />
                  <span>Mengambil data fitur peta...</span>
                </>
              ) : (
                "Simpan & Ambil Data Peta"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
