// features/maps/TileDownloader.ts

/**
 * Utility to pre-fetch and cache MapLibre/Raster tiles for offline use.
 * Specifically built for OpenTopoMap zoom levels 13-17.
 */

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

export interface DownloadProgress {
  total: number;
  downloaded: number;
  failed: number;
  status: "idle" | "downloading" | "complete" | "error";
}

export class TileDownloader {
  /**
   * Caches OpenTopoMap tiles for the given bounding box at zoom levels 14 to 17.
   */
  static async downloadArea(
    west: number,
    south: number,
    east: number,
    north: number,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<void> {
    const urlsToFetch: string[] = [];
    const minZoom = 14;
    const maxZoom = 17;

    for (let z = minZoom; z <= maxZoom; z++) {
      const topTile = lat2tile(north, z);
      const bottomTile = lat2tile(south, z);
      const leftTile = lon2tile(west, z);
      const rightTile = lon2tile(east, z);

      for (let x = leftTile; x <= rightTile; x++) {
        for (let y = topTile; y <= bottomTile; y++) {
          urlsToFetch.push(`https://a.tile.opentopomap.org/${z}/${x}/${y}.png`);
          urlsToFetch.push(`https://b.tile.opentopomap.org/${z}/${x}/${y}.png`);
          urlsToFetch.push(`https://c.tile.opentopomap.org/${z}/${x}/${y}.png`);
        }
      }
    }

    // De-duplicate (though different subdomains, we just cache 'a' usually, but next-pwa handles caching by request. 
    // To save bandwidth, we only download from 'a' subdomain since they point to the same tiles.
    const uniqueTiles = Array.from(new Set(urlsToFetch.filter(u => u.startsWith("https://a."))));

    let downloaded = 0;
    let failed = 0;

    onProgress?.({
      total: uniqueTiles.length,
      downloaded,
      failed,
      status: "downloading",
    });

    const CACHE_NAME = "offline-map-tiles";
    let cache: Cache;
    try {
      cache = await caches.open(CACHE_NAME);
    } catch (err) {
      console.warn("Cache API not available", err);
      onProgress?.({
        total: uniqueTiles.length,
        downloaded,
        failed,
        status: "error",
      });
      return;
    }

    // Process in batches of 5 to avoid browser connection limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueTiles.length; i += BATCH_SIZE) {
      const batch = uniqueTiles.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const req = new Request(url, { mode: "cors" });
            const existing = await cache.match(req);
            if (!existing) {
              const res = await fetch(req);
              if (res.ok) {
                await cache.put(req, res.clone());
              } else {
                failed++;
              }
            }
          } catch (e) {
            failed++;
          }
          downloaded++;
        })
      );
      
      onProgress?.({
        total: uniqueTiles.length,
        downloaded,
        failed,
        status: "downloading",
      });
    }

    onProgress?.({
      total: uniqueTiles.length,
      downloaded,
      failed,
      status: "complete",
    });
  }
}
