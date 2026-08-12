/**
 * MapAreaService — domain service for Map Area CRUD and feature fetching.
 * Keeps data access and geospatial orchestration out of UI components.
 */

import { createClient } from "@/lib/supabase/client";
import { OsmOverpassProvider } from "@/lib/providers/osm/overpass";
import { polygonBBox, bboxCenter } from "@/lib/geo";
import type { MapArea, MapFeature, MapSourceType } from "@/types/database";
import type { LatLng, BBox } from "@/types/map";

export interface CreateMapAreaInput {
  name: string;
  description?: string;
  boundary: GeoJSON.Polygon;
  sourceType?: MapSourceType;
}

export class MapAreaService {
  private static overpassProvider = new OsmOverpassProvider();

  /** List user's map areas */
  static async listMapAreas(): Promise<MapArea[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_areas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as MapArea[];
    } catch {
      return [];
    }
  }

  /** Get map area by ID */
  static async getMapArea(id: string): Promise<MapArea | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_areas")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return data as MapArea;
    } catch {
      return null;
    }
  }

  /** Create a new map area and automatically fetch OSM features */
  static async createMapArea(input: CreateMapAreaInput): Promise<{
    mapArea: MapArea | null;
    featuresCount: number;
    error: string | null;
  }> {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        return { mapArea: null, featuresCount: 0, error: "Belum masuk akun." };
      }

      // Calculate bbox and center point
      const bbox = polygonBBox(input.boundary);
      const centerLatLng = bboxCenter(bbox);
      const centerPoint: GeoJSON.Point = {
        type: "Point",
        coordinates: [centerLatLng.lng, centerLatLng.lat],
      };

      // 1. Insert map_area record
      const { data: areaData, error: areaError } = await supabase
        .from("map_areas")
        .insert({
          user_id: userData.user.id,
          name: input.name,
          description: input.description || null,
          boundary: input.boundary,
          center: centerPoint,
          source_type: input.sourceType || "osm",
        })
        .select()
        .single();

      if (areaError || !areaData) {
        return {
          mapArea: null,
          featuresCount: 0,
          error: areaError?.message || "Gagal menyimpan area peta.",
        };
      }

      const mapArea = areaData as MapArea;

      // 2. Ingest geographic features from OSM Overpass provider
      let featuresCount = 0;
      try {
        const osmResult = await this.overpassProvider.fetchFeatures(bbox);

        if (osmResult.features.features.length > 0) {
          const featureRecords = osmResult.features.features.map((f) => ({
            map_area_id: mapArea.id,
            feature_type: (f.properties?.feature_type as string) || "other",
            geometry: f.geometry,
            properties: f.properties || {},
            source: "osm",
            confidence: 1.0,
          }));

          const { count } = await supabase
            .from("map_features")
            .insert(featureRecords);

          featuresCount = count || featureRecords.length;
        }
      } catch (err) {
        console.warn("Features ingestion warning:", err);
      }

      return { mapArea, featuresCount, error: null };
    } catch (err) {
      return {
        mapArea: null,
        featuresCount: 0,
        error: err instanceof Error ? err.message : "Terjadi kesalahan.",
      };
    }
  }

  /** Delete a map area */
  static async deleteMapArea(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("map_areas").delete().eq("id", id);
      return !error;
    } catch {
      return false;
    }
  }

  /** Get map features for a map area */
  static async getMapFeatures(mapAreaId: string): Promise<MapFeature[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_features")
        .select("*")
        .eq("map_area_id", mapAreaId);

      if (error || !data) return [];
      return data as MapFeature[];
    } catch {
      return [];
    }
  }
}
