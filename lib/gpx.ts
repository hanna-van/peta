import type { GpsTrack, Course, CourseControl } from "@/types/database";

/**
 * Generates a GPX 1.1 format XML string from training data
 */
export function generateGpx(
  sessionName: string,
  tracks: GpsTrack[],
  course?: Course,
  controls?: CourseControl[]
): string {
  const timeStr = tracks.length > 0 ? new Date(tracks[0].recorded_at).toISOString() : new Date().toISOString();

  let waypoints = "";
  if (course && controls) {
    controls.forEach((c) => {
      const name = c.sequence === 0 ? "Start" : c.sequence === controls.length - 1 ? "Finish" : `CP${c.sequence}`;
      waypoints += `
  <wpt lat="${c.point.coordinates[1]}" lon="${c.point.coordinates[0]}">
    <name>${name}</name>
    <sym>Control</sym>
    <type>${c.feature_type || "Control"}</type>
  </wpt>`;
    });
  }

  const trackPoints = tracks.map((t) => {
    const ele = t.altitude_m !== null ? `\n        <ele>${t.altitude_m.toFixed(2)}</ele>` : "";
    return `      <trkpt lat="${t.point.coordinates[1]}" lon="${t.point.coordinates[0]}">${ele}
        <time>${new Date(t.recorded_at).toISOString()}</time>
      </trkpt>`;
  }).join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Orienteering Training Platform" xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${sessionName}</name>
    <time>${timeStr}</time>
  </metadata>${waypoints}
  <trk>
    <name>${sessionName} Track</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Triggers a browser download of the given text content
 */
export function downloadFile(filename: string, content: string, mimeType: string = "application/gpx+xml") {
  if (typeof window === "undefined") return;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
