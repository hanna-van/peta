"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./MapViewClient";

const MapViewClient = dynamic<MapViewProps>(
  () => import("./MapViewClient").then((mod) => mod.MapViewClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="map-container flex-center"
        style={{ width: "100%", height: "100%", minHeight: 400, backgroundColor: "var(--color-bg-secondary)" }}
      >
        <div className="spinner" />
      </div>
    ),
  }
);

export function MapView(props: MapViewProps) {
  return <MapViewClient {...props} />;
}
