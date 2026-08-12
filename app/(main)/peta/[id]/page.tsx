"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { FeatureLayer } from "@/components/map/FeatureLayer";
import { MapAreaService } from "@/features/maps/MapAreaService";
import type { MapArea, MapFeature } from "@/types/database";
import type maplibregl from "maplibre-gl";

export const dynamic = "force-dynamic";

export default function PetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mapArea, setMapArea] = useState<MapArea | null>(null);
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const area = await MapAreaService.getMapArea(id);
      if (!area) {
        router.push("/peta");
        return;
      }
      setMapArea(area);
      const featList = await MapAreaService.getMapFeatures(id);
      setFeatures(featList);
      setLoading(false);
    }
    loadData();
  }, [id, router]);

  if (loading || !mapArea) {
    return (
      <div className="page flex-center" style={{ minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const centerLatLng = mapArea.center
    ? { lat: mapArea.center.coordinates[1], lng: mapArea.center.coordinates[0] }
    : { lat: -6.2088, lng: 106.8456 };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        className="page-header"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <h1 className="text-section">{mapArea.name}</h1>
          <p className="text-helper">
            {features.length} fitur peta terdeteksi
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => router.push(`/latihan/baru?mapId=${mapArea.id}`)}
        >
          + Buat Jalur
        </button>
      </div>

      {/* Map display */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          initialCenter={centerLatLng}
          initialZoom={16}
          onMapReady={setMapInstance}
        >
          <FeatureLayer map={mapInstance} features={features} />
        </MapView>
      </div>
    </div>
  );
}
