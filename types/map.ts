/**
 * Map domain types — provider abstractions and map rendering
 */

/** Bounding box as [west, south, east, north] in WGS84 */
export type BBox = [number, number, number, number];

/** A geographic coordinate */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Map tile source configuration */
export interface TileSource {
  id: string;
  name: string;
  type: "vector" | "raster";
  url: string;
  attribution: string;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * MapDataProvider — abstraction for fetching geographic features
 * for a given bounding box. Implementations: OSM Overpass, etc.
 */
export interface MapDataProvider {
  readonly id: string;
  readonly name: string;

  /** Fetch geographic features within a bounding box */
  fetchFeatures(bbox: BBox): Promise<MapDataResult>;

  /** Check if the provider is available */
  isAvailable(): Promise<boolean>;
}

export interface MapDataResult {
  features: GeoJSON.FeatureCollection;
  provider: string;
  fetchedAt: string;
  /** Whether the data is from a development fixture */
  isFixture: boolean;
}

/**
 * ElevationProvider — abstraction for fetching elevation data
 */
export interface ElevationProvider {
  readonly id: string;
  readonly name: string;

  /** Get elevation for a single point */
  getElevation(lat: number, lng: number): Promise<number | null>;

  /** Get elevations for multiple points */
  getElevations(
    points: LatLng[]
  ): Promise<(number | null)[]>;

  /** Check if the provider is available */
  isAvailable(): Promise<boolean>;
}

/** Map view state */
export interface MapViewState {
  center: LatLng;
  zoom: number;
  bearing: number;
  pitch: number;
}
