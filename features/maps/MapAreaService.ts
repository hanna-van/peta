/**
 * MapAreaService — domain service for Map Area CRUD and feature fetching.
 * Supports Supabase database with seamless LocalStorage fallback for guest/offline mode.
 * Keeps data access and geospatial orchestration out of UI components.
 */

import { createClient } from "@/lib/supabase/client";
import { OsmOverpassProvider } from "@/lib/providers/osm/overpass";
import { polygonBBox, bboxCenter } from "@/lib/geo";
import type { MapArea, MapFeature, MapSourceType, FeatureType } from "@/types/database";

const LOCAL_MAPS_KEY = "orienteering_local_map_areas";
const LOCAL_FEATURES_KEY = "orienteering_local_map_features";

export interface CreateMapAreaInput {
  name: string;
  description?: string;
  boundary: GeoJSON.Polygon;
  sourceType?: MapSourceType;
  metadata?: Record<string, any>;
}

export class MapAreaService {
  private static overpassProvider = new OsmOverpassProvider();

  /** Helper to get local maps */
  private static getLocalMaps(): MapArea[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_MAPS_KEY);
      return raw ? (JSON.parse(raw) as MapArea[]) : [];
    } catch {
      return [];
    }
  }

  /** Helper to save local maps */
  private static saveLocalMaps(maps: MapArea[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_MAPS_KEY, JSON.stringify(maps));
    } catch {
      // Ignore storage errors
    }
  }

  /** Helper to get local features */
  private static getLocalFeatures(): MapFeature[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_FEATURES_KEY);
      return raw ? (JSON.parse(raw) as MapFeature[]) : [];
    } catch {
      return [];
    }
  }

  /** Helper to save local features */
  private static saveLocalFeatures(features: MapFeature[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_FEATURES_KEY, JSON.stringify(features));
    } catch {
      // Ignore storage errors
    }
  }

  /** List map areas (combines Supabase & Local fallback) */
  static async listMapAreas(): Promise<MapArea[]> {
    const local = this.getLocalMaps();
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_areas")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as MapArea[];
      }
    } catch {
      // Fallback to local
    }
    return local;
  }

  /** Get map area by ID */
  static async getMapArea(id: string): Promise<MapArea | null> {
    // Check local first
    const localMap = this.getLocalMaps().find((m) => m.id === id);
    if (localMap) return localMap;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_areas")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) return data as MapArea;
    } catch {
      // Ignore
    }
    return null;
  }

  /** Create a new map area with automatic OSM feature ingestion & fallback */
  static async createMapArea(input: CreateMapAreaInput): Promise<{
    mapArea: MapArea | null;
    featuresCount: number;
    error: string | null;
  }> {
    const bbox = polygonBBox(input.boundary);
    const centerLatLng = bboxCenter(bbox);
    const centerPoint: GeoJSON.Point = {
      type: "Point",
      coordinates: [centerLatLng.lng, centerLatLng.lat],
    };

    let mapArea: MapArea | null = null;
    let savedToSupabase = false;

    // 1. Try saving to Supabase if authenticated
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { data: areaData, error: areaError } = await supabase
          .from("map_areas")
          .insert({
            user_id: userData.user.id,
            name: input.name,
            description: input.description || null,
            boundary: input.boundary,
            center: centerPoint,
            source_type: input.sourceType || "osm",
            metadata: input.metadata || {},
          })
          .select()
          .single();

        if (!areaError && areaData) {
          mapArea = areaData as MapArea;
          savedToSupabase = true;
        }
      }
    } catch {
      // Supabase unavailable or guest user
    }

    // 2. Local fallback map area creation if not saved to Supabase
    if (!mapArea) {
      mapArea = {
        id: crypto.randomUUID(),
        user_id: "local_user",
        name: input.name,
        description: input.description || null,
        boundary: input.boundary,
        center: centerPoint,
        source_type: input.sourceType || "osm",
        map_version: "1.0",
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const localMaps = this.getLocalMaps();
      localMaps.unshift(mapArea);
      this.saveLocalMaps(localMaps);
    }

    // 3. Ingest geographic features from OSM Overpass provider
    let featuresCount = 0;
    try {
      const osmResult = await this.overpassProvider.fetchFeatures(bbox);

      if (osmResult.features.features.length > 0) {
        const featureRecords: MapFeature[] = osmResult.features.features.map((f) => ({
          id: crypto.randomUUID(),
          map_area_id: mapArea!.id,
          feature_type: (f.properties?.feature_type as FeatureType) || "other",
          geometry: f.geometry,
          properties: f.properties || {},
          source: "osm",
          confidence: 1.0,
          created_at: new Date().toISOString(),
        }));

        featuresCount = featureRecords.length;

        if (savedToSupabase) {
          try {
            const supabase = createClient();
            const dbRecords = featureRecords.map(({ id, created_at, ...rest }) => rest);
            await supabase.from("map_features").insert(dbRecords);
          } catch {
            // Ignore DB feature insert warning
          }
        } else {
          const localFeats = this.getLocalFeatures();
          this.saveLocalFeatures([...featureRecords, ...localFeats]);
        }
      }
    } catch (err) {
      console.warn("OSM features ingestion warning:", err);
    }

    return { mapArea, featuresCount, error: null };
  }

  /** Get map features for a map area */
  static async getMapFeatures(mapAreaId: string): Promise<MapFeature[]> {
    const localFeats = this.getLocalFeatures().filter((f) => f.map_area_id === mapAreaId);
    if (localFeats.length > 0) return localFeats;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_features")
        .select("*")
        .eq("map_area_id", mapAreaId);

      if (!error && data) return data as MapFeature[];
    } catch {
      // Ignore
    }
    return [];
  }
}
