/**
 * Map tile source configuration.
 * Supports MapTiler vector tiles (if key available) or CARTO Voyager vector style fallback.
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

  // OpenTopoMap fallback (excellent for outdoors/orienteering)
  return {
    id: "opentopomap",
    name: "OpenTopoMap",
    type: "raster",
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    minZoom: 2,
  };
}

/**
 * Get the MapLibre style object for the tile source.
 * Vector tiles return the style JSON URL directly.
 * Raster tiles return inline style specification.
 */
export function getMapStyle(): string | object {
  const source = getTileSource();

  if (source.type === "vector") {
    return source.url;
  }

  return {
    version: 8,
    name: source.name,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: source.attribution,
        maxzoom: 17,
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
