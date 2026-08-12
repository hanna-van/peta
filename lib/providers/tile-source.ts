/**
 * Map tile source configuration.
 * Supports MapTiler vector tiles (if key available) or OSM raster fallback.
 */

import type { TileSource } from "@/types/map";

/** Get the configured tile source based on environment */
export function getTileSource(): TileSource {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (maptilerKey) {
    return {
      id: "maptiler-outdoor",
      name: "MapTiler Outdoor",
      type: "vector",
      url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${maptilerKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22,
      minZoom: 0,
    };
  }

  // Fallback: free OSM raster tiles with reliable tile mirrors
  return {
    id: "osm-raster",
    name: "OpenStreetMap",
    type: "raster",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 0,
  };
}

/**
 * Get the MapLibre style object for the tile source.
 * Vector tiles use a style JSON URL.
 * Raster tiles use an inline style with raster source.
 */
export function getMapStyle(): string | object {
  const source = getTileSource();

  if (source.type === "vector") {
    return source.url;
  }

  // Inline style for raster tiles
  return {
    version: 8,
    name: source.name,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [source.url],
        tileSize: 256,
        attribution: source.attribution,
        maxzoom: source.maxZoom,
      },
    },
    layers: [
      {
        id: "osm-raster-layer",
        type: "raster",
        source: "osm-raster",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}
