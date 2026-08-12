import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

interface ImageOverlayLayerProps {
  map: maplibregl.Map | null;
  imageBase64: string | null;
  coordinates: [number, number][] | null;
}

export function ImageOverlayLayer({
  map,
  imageBase64,
  coordinates,
}: ImageOverlayLayerProps) {
  useEffect(() => {
    if (!map || !imageBase64 || !coordinates || coordinates.length !== 4) return;

    const sourceId = "ocad-overlay-source-global";
    const layerId = "ocad-overlay-layer-global";

    try {
      if (map.getSource(sourceId)) {
        // Source already exists, just update it if possible
      } else {
        map.addSource(sourceId, {
          type: "image",
          url: imageBase64,
          coordinates: coordinates as any,
        });

        // Insert the overlay layer BEFORE any course layers so it sits under the lines
        // We can just add it at the bottom, above the base map
        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": 1.0, 
            "raster-fade-duration": 0
          },
        });
      }
    } catch (e) {
      console.warn("Failed to add image overlay", e);
    }

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {
        // Ignore
      }
    };
  }, [map, imageBase64, coordinates]);

  return null;
}
