/**
 * OSM Overpass API provider for geographic feature data.
 * Implements MapDataProvider interface.
 */

import type { MapDataProvider, MapDataResult, BBox } from "@/types/map";
import type { FeatureType } from "@/types/database";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/** Map OSM tags to our feature types */
const TAG_MAPPING: Record<string, FeatureType> = {
  highway_path: "trail",
  highway_footway: "trail",
  highway_track: "trail",
  highway_residential: "road",
  highway_tertiary: "road",
  highway_secondary: "road",
  highway_primary: "road",
  highway_unclassified: "road",
  highway_service: "road",
  building_yes: "building",
  building: "building",
  natural_water: "water",
  waterway_stream: "water",
  waterway_river: "water",
  natural_wood: "vegetation",
  landuse_forest: "vegetation",
  natural_scrub: "vegetation",
  barrier_fence: "fence",
  man_made_ditch: "ditch",
  natural_stone: "boulder",
  natural_tree: "tree",
  landuse_meadow: "open_area",
  natural_grassland: "open_area",
  landuse_grass: "open_area",
};

function mapOsmTags(tags: Record<string, string>): FeatureType {
  for (const [key, value] of Object.entries(tags)) {
    const lookup = `${key}_${value}`;
    if (TAG_MAPPING[lookup]) return TAG_MAPPING[lookup];
    if (TAG_MAPPING[key]) return TAG_MAPPING[key];
  }
  return "other";
}

function buildOverpassQuery(bbox: BBox): string {
  const [west, south, east, north] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  return `
    [out:json][timeout:30];
    (
      way["highway"~"path|footway|track|residential|tertiary|secondary|primary|unclassified|service"](${bboxStr});
      way["building"](${bboxStr});
      way["natural"~"water|wood|scrub|grassland"](${bboxStr});
      way["waterway"~"stream|river"](${bboxStr});
      way["landuse"~"forest|meadow|grass"](${bboxStr});
      way["barrier"="fence"](${bboxStr});
      node["natural"~"tree|stone"](${bboxStr});
    );
    out body;
    >;
    out skel qt;
  `;
}

/** Convert Overpass JSON to GeoJSON FeatureCollection */
function overpassToGeoJSON(
  data: OverpassResponse
): GeoJSON.FeatureCollection {
  const nodeMap = new Map<number, [number, number]>();

  // Build node lookup
  for (const el of data.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, [el.lon, el.lat]);
    }
  }

  const features: GeoJSON.Feature[] = [];

  for (const el of data.elements) {
    if (el.type === "node" && el.tags && Object.keys(el.tags).length > 0) {
      const coord = nodeMap.get(el.id);
      if (!coord) continue;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord },
        properties: {
          osm_id: el.id,
          feature_type: mapOsmTags(el.tags),
          ...el.tags,
        },
      });
    }

    if (el.type === "way" && el.nodes) {
      const coords = el.nodes
        .map((nid) => nodeMap.get(nid))
        .filter((c): c is [number, number] => c !== undefined);

      if (coords.length < 2) continue;

      const tags = el.tags || {};
      const isClosed =
        coords.length >= 4 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1];

      const isArea =
        isClosed &&
        (tags.building ||
          tags.natural === "water" ||
          tags.natural === "wood" ||
          tags.landuse);

      features.push({
        type: "Feature",
        geometry: isArea
          ? { type: "Polygon", coordinates: [coords] }
          : { type: "LineString", coordinates: coords },
        properties: {
          osm_id: el.id,
          feature_type: mapOsmTags(tags),
          ...tags,
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export class OsmOverpassProvider implements MapDataProvider {
  readonly id = "osm-overpass";
  readonly name = "OpenStreetMap (Overpass)";

  async fetchFeatures(bbox: BBox): Promise<MapDataResult> {
    const query = buildOverpassQuery(bbox);

    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`
      );
    }

    const data: OverpassResponse = await response.json();
    const features = overpassToGeoJSON(data);

    return {
      features,
      provider: this.id,
      fetchedAt: new Date().toISOString(),
      isFixture: false,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${OVERPASS_API}?data=[out:json];out;`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
