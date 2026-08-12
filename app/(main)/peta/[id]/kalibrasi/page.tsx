"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { MapView } from "@/components/map/MapView";
import { MapAreaService } from "@/features/maps/MapAreaService";
import type { MapArea } from "@/types/database";

export const dynamic = "force-dynamic";

export default function PetaKalibrasiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mapArea, setMapArea] = useState<MapArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [overlayCoords, setOverlayCoords] = useState<[number, number][] | null>(null);

  const markersRef = useRef<maplibregl.Marker[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const area = await MapAreaService.getMapArea(id);
      if (!area) {
        router.push("/peta");
        return;
      }
      setMapArea(area);
      
      // Load existing metadata if available
      if (area.metadata?.overlay_image) {
        setImageBase64(area.metadata.overlay_image as string);
      }
      if (area.metadata?.overlay_coords) {
        setOverlayCoords(area.metadata.overlay_coords as [number, number][]);
      } else if (area.center) {
        // Initial coordinates (box around center)
        const lat = area.center.coordinates[1];
        const lng = area.center.coordinates[0];
        const offset = 0.005;
        setOverlayCoords([
          [lng - offset, lat + offset], // top-left
          [lng + offset, lat + offset], // top-right
          [lng + offset, lat - offset], // bottom-right
          [lng - offset, lat - offset], // bottom-left
        ]);
      }
      
      setLoading(false);
    }
    loadData();
  }, [id, router]);

  // Handle Image Upload & Compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to save DB space
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // 60% quality jpeg
        setImageBase64(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Render Image Overlay
  useEffect(() => {
    if (!mapInstance || !imageBase64 || !overlayCoords) return;
    const map = mapInstance;
    const sourceId = "ocad-overlay-source";
    const layerId = "ocad-overlay-layer";

    // Setup source
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.ImageSource).updateImage({
        url: imageBase64,
        coordinates: overlayCoords as any,
      });
    } else {
      map.addSource(sourceId, {
        type: "image",
        url: imageBase64,
        coordinates: overlayCoords as any,
      });

      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": 0.7, // Semi transparent to see base map below
        },
      });
    }

    // Setup draggable markers if not setup
    if (markersRef.current.length === 0) {
      const colors = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"]; // TL, TR, BR, BL
      
      overlayCoords.forEach((coord, i) => {
        const marker = new maplibregl.Marker({
          draggable: true,
          color: colors[i],
        })
          .setLngLat(coord)
          .addTo(map);

        marker.on("drag", () => {
          const newCoords = markersRef.current.map(m => {
            const ll = m.getLngLat();
            return [ll.lng, ll.lat] as [number, number];
          });
          setOverlayCoords(newCoords);
        });

        markersRef.current.push(marker);
      });
    }
  }, [mapInstance, imageBase64, overlayCoords]);

  const handleSave = async () => {
    if (!mapArea || !imageBase64 || !overlayCoords) return;
    setSaving(true);
    
    const newMetadata = {
      ...(mapArea.metadata || {}),
      overlay_image: imageBase64,
      overlay_coords: overlayCoords,
    };
    
    const success = await MapAreaService.updateMapAreaMetadata(mapArea.id, newMetadata);
    if (success) {
      alert("Peta gambar berhasil dikalibrasi!");
      router.push(`/peta/${mapArea.id}`);
    } else {
      alert("Gagal menyimpan kalibrasi.");
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!mapArea) return;
    setSaving(true);
    
    const newMetadata = { ...(mapArea.metadata || {}) };
    delete newMetadata.overlay_image;
    delete newMetadata.overlay_coords;
    
    await MapAreaService.updateMapAreaMetadata(mapArea.id, newMetadata);
    router.push(`/peta/${mapArea.id}`);
  };

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
          zIndex: 80,
        }}
      >
        <div>
          <h1 className="text-section">Kalibrasi Image Overlay</h1>
          <p className="text-helper">{mapArea.name}</p>
        </div>
        
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {imageBase64 && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={saving}>Hapus</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "✔ Simpan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Banner */}
      {!imageBase64 && (
        <div style={{ padding: "var(--space-4)", backgroundColor: "var(--color-bg-elevated)", textAlign: "center" }}>
          <p className="text-body" style={{ marginBottom: "var(--space-3)" }}>
            Unggah file peta OCAD (JPG/PNG). Gambar akan dikompresi otomatis untuk menghemat ruang.
          </p>
          <input
            type="file"
            accept="image/jpeg, image/png"
            onChange={handleImageUpload}
            style={{ display: "none" }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="btn btn-primary">
            📁 Pilih Gambar Peta
          </label>
        </div>
      )}

      {imageBase64 && (
        <div style={{ padding: "var(--space-2)", textAlign: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <p className="text-helper" style={{ color: "var(--color-accent)" }}>
            Tarik ke-4 pin warna-warni untuk mengepaskan ujung gambar dengan kontur dunia nyata.
          </p>
        </div>
      )}

      {/* Map display */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          initialCenter={centerLatLng}
          initialZoom={15}
          onMapReady={setMapInstance}
        />
      </div>
    </div>
  );
}
