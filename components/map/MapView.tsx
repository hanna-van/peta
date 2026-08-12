"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/lib/providers/tile-source";
import type { LatLng, MapViewState } from "@/types/map";

interface MapViewProps {
  /** Initial center — defaults to Jakarta */
  initialCenter?: LatLng;
  /** Initial zoom — defaults to 14 (neighborhood level) */
  initialZoom?: number;
  /** Whether to show the user's current GPS position */
  showUserLocation?: boolean;
  /** Fullscreen mode (for training) */
  fullscreen?: boolean;
  /** Called when the map is ready */
  onMapReady?: (map: maplibregl.Map) => void;
  /** Called when the map view changes */
  onViewChange?: (state: MapViewState) => void;
  /** Additional CSS class */
  className?: string;
  /** Children to render as overlays */
  children?: React.ReactNode;
}

/**
 * MapView — core map component using MapLibre GL JS.
 * Keeps map state isolated from React state per docs/12-TECHNICAL-ARCHITECTURE.md.
 */
export function MapView({
  initialCenter = { lat: -6.2088, lng: 106.8456 },
  initialZoom = 14,
  showUserLocation = false,
  fullscreen = false,
  onMapReady,
  onViewChange,
  className,
  children,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const style = getMapStyle();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style as string | maplibregl.StyleSpecification,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      attributionControl: {},
      maxZoom: 20,
      minZoom: 2,
    });

    // Navigation controls (zoom, compass)
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      "top-right"
    );

    // Geolocation control
    if (showUserLocation) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showAccuracyCircle: true,
        }),
        "top-right"
      );
    }

    // Scale bar
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120 }),
      "bottom-left"
    );

    map.on("load", async () => {
      setMapLoaded(true);
      onMapReady?.(map);

      // If using default Jakarta initialCenter, attempt fast IPInfo location fallback
      if (initialCenter.lat === -6.2088 && initialCenter.lng === 106.8456) {
        try {
          const { IpLocationProvider } = await import("@/lib/providers/ipinfo");
          const ipResult = await IpLocationProvider.getCurrentLocation();
          if (ipResult && mapRef.current) {
            mapRef.current.flyTo({
              center: [ipResult.location.lng, ipResult.location.lat],
              zoom: initialZoom,
              duration: 1500,
            });
          }
        } catch {
          // Ignore fallback errors
        }
      }
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      onViewChange?.({
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });

    mapRef.current = map;
  }, [initialCenter, initialZoom, showUserLocation, onMapReady, onViewChange]);

  useEffect(() => {
    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initMap]);

  return (
    <div
      className={`map-container ${fullscreen ? "map-container-fullscreen" : ""} ${className || ""}`}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: fullscreen ? undefined : 400 }}
      />
      {mapLoaded && children}
    </div>
  );
}
