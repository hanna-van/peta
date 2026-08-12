"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/lib/providers/tile-source";
import type { LatLng, MapViewState } from "@/types/map";

export interface MapViewProps {
  initialCenter?: LatLng;
  initialZoom?: number;
  showUserLocation?: boolean;
  fullscreen?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  onViewChange?: (state: MapViewState) => void;
  className?: string;
  children?: React.ReactNode;
}

export function MapViewClient({
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
  const hasAttemptedIpLocation = useRef(false);

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

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      "top-right"
    );

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

    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120 }),
      "bottom-left"
    );

    map.on("load", async () => {
      setMapLoaded(true);
      map.resize();
      onMapReady?.(map);

      // Attempt IP location fallback once if default center
      if (
        !hasAttemptedIpLocation.current &&
        initialCenter.lat === -6.2088 &&
        initialCenter.lng === 106.8456
      ) {
        hasAttemptedIpLocation.current = true;
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
