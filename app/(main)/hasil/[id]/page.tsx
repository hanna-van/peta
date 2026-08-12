"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { CourseLayer } from "@/components/map/CourseLayer";
import { ImageOverlayLayer } from "@/components/map/ImageOverlayLayer";
import { ReplayPlayer } from "@/components/replay/ReplayPlayer";
import { CourseService } from "@/features/courses/CourseService";
import { MapAreaService } from "@/features/maps/MapAreaService";
import { AnalysisEngine } from "@/features/analysis/AnalysisEngine";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, formatDistance } from "@/lib/geo";
import type {
  TrainingSession,
  GpsTrack,
  ControlVisit,
  Course,
  CourseControl,
} from "@/types/database";
import type {
  OverallAnalysis,
  LegAnalysis,
} from "@/types/database";
import type maplibregl from "maplibre-gl";

export default function HasilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [controls, setControls] = useState<CourseControl[]>([]);
  const [mapArea, setMapArea] = useState<any>(null);
  const [tracks, setTracks] = useState<GpsTrack[]>([]);
  const [visits, setVisits] = useState<ControlVisit[]>([]);
  const [analysis, setAnalysis] = useState<{
    overall: OverallAnalysis;
    legs: LegAnalysis[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"replay" | "analysis">("replay");
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // 1. Fetch training session
        const { data: sData } = await supabase
          .from("training_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (!sData) {
          router.push("/hasil");
          return;
        }

        const sess = sData as TrainingSession;
        setSession(sess);

        // 2. Fetch course & controls
        const { course: c, controls: ctrls } =
          await CourseService.getCourseWithControls(sess.course_id);
        setCourse(c);
        setControls(ctrls);

        if (c?.map_area_id) {
          const area = await MapAreaService.getMapArea(c.map_area_id);
          setMapArea(area);
        }

        // 3. Fetch GPS tracks
        const { data: trkData } = await supabase
          .from("gps_tracks")
          .select("*")
          .eq("session_id", sessionId)
          .order("recorded_at", { ascending: true });

        const trks = (trkData as GpsTrack[]) || [];
        setTracks(trks);

        // 4. Fetch Control visits
        const { data: vstData } = await supabase
          .from("control_visits")
          .select("*")
          .eq("session_id", sessionId)
          .order("confirmed_at", { ascending: true });

        const vsts = (vstData as ControlVisit[]) || [];
        setVisits(vsts);

        // 5. Run analysis engine
        const result = AnalysisEngine.analyze(trks, vsts, ctrls);
        setAnalysis(result);
      } catch (err) {
        console.warn("Failed to load result details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId, router]);

  if (loading || !session) {
    return (
      <div className="page flex-center" style={{ minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const generatedControls = controls.map((c) => ({
    sequence: c.sequence,
    position: {
      lat: c.point.coordinates[1],
      lng: c.point.coordinates[0],
    },
    featureType: c.feature_type,
    rationale: (c.metadata?.rationale as string) || "",
  }));

  const centerLatLng = controls.length > 0
    ? { lat: controls[0].point.coordinates[1], lng: controls[0].point.coordinates[0] }
    : { lat: -6.2088, lng: 106.8456 };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Top Header & Tab Switcher */}
      <div
        className="page-header"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 80,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h1 className="text-section">Hasil Latihan</h1>
            <p className="text-helper">
              {session.duration_seconds
                ? formatDuration(session.duration_seconds)
                : "Selesai"}{" "}
              • {session.distance_m ? formatDistance(session.distance_m) : "0 m"}
            </p>
          </div>
          
          <button 
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const { generateGpx, downloadFile } = await import("@/lib/gpx");
              const gpxData = generateGpx(`Orienteering ${new Date(session.created_at).toLocaleDateString()}`, tracks, course || undefined, controls);
              downloadFile(`orienteering_${session.id.slice(0,8)}.gpx`, gpxData);
            }}
          >
            ⬇ Export GPX
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="segmented" style={{ width: 180 }}>
          <button
            className="segmented-item"
            data-active={activeTab === "replay"}
            onClick={() => setActiveTab("replay")}
          >
            Putar Ulang
          </button>
          <button
            className="segmented-item"
            data-active={activeTab === "analysis"}
            onClick={() => setActiveTab("analysis")}
          >
            Analisis
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "replay" ? (
        <div style={{ flex: 1, position: "relative" }}>
          <MapView
            initialCenter={centerLatLng}
            initialZoom={16}
            onMapReady={setMapInstance}
            fullscreen={false}
          >
            {mapArea?.metadata?.overlay_image && mapArea?.metadata?.overlay_coords && (
              <ImageOverlayLayer
                map={mapInstance}
                imageBase64={mapArea.metadata.overlay_image as string}
                coordinates={mapArea.metadata.overlay_coords as any}
              />
            )}
            <CourseLayer map={mapInstance} controls={generatedControls} />
            <ReplayPlayer
              map={mapInstance}
              tracks={tracks}
              visits={visits}
              controls={controls}
            />
          </MapView>
        </div>
      ) : (
        <div
          className="page-content"
          style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}
        >
          {/* Overall Summary Card */}
          {analysis && (
            <div className="card" style={{ marginBottom: "var(--space-4)" }}>
              <h2 className="text-label" style={{ marginBottom: "var(--space-3)" }}>
                Ringkasan Sesi
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3)",
                }}
              >
                <div>
                  <span className="text-helper">Total Waktu</span>
                  <div className="text-section">
                    {formatDuration(analysis.overall.total_duration_s)}
                  </div>
                </div>

                <div>
                  <span className="text-helper">Total Jarak</span>
                  <div className="text-section">
                    {formatDistance(analysis.overall.total_distance_m)}
                  </div>
                </div>

                <div>
                  <span className="text-helper">Pos Ditemukan</span>
                  <div className="text-section">
                    {analysis.overall.controls_found} / {analysis.overall.total_controls}
                  </div>
                </div>

                <div>
                  <span className="text-helper">Kualitas GPS</span>
                  <div>
                    <span
                      className={`badge ${
                        analysis.overall.gps_quality === "high"
                          ? "badge-success"
                          : analysis.overall.gps_quality === "medium"
                            ? "badge-warning"
                            : "badge-error"
                      }`}
                    >
                      {analysis.overall.gps_quality.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leg-by-leg Breakdown */}
          <h2 className="text-label" style={{ marginBottom: "var(--space-3)" }}>
            Analisis Per Leg (CP ke CP)
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {analysis?.legs.map((leg) => (
              <div key={leg.leg_number} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  <span className="text-body" style={{ fontWeight: 700 }}>
                    Leg {leg.leg_number} (CP {leg.from_control} → CP {leg.to_control})
                  </span>
                  <span className="text-body" style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                    {formatDuration(leg.duration_s)}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-3)", marginTop: "var(--space-2)" }}>
                  <div>
                    <span className="text-helper" style={{ fontSize: "var(--font-size-xs)" }}>Jarak</span>
                    <div className="text-body" style={{ fontWeight: 600 }}>{formatDistance(leg.distance_m)}</div>
                  </div>
                  <div>
                    <span className="text-helper" style={{ fontSize: "var(--font-size-xs)" }}>Pace</span>
                    <div className="text-body" style={{ fontWeight: 600 }}>{leg.pace_min_km ? `${leg.pace_min_km}/km` : "-"}</div>
                  </div>
                  <div>
                    <span className="text-helper" style={{ fontSize: "var(--font-size-xs)" }}>Efisiensi</span>
                    <div>
                      {leg.efficiency_pct !== null ? (
                        <span className={`badge ${leg.efficiency_pct >= 85 ? "badge-success" : leg.efficiency_pct >= 60 ? "badge-warning" : "badge-error"}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {leg.efficiency_pct}%
                        </span>
                      ) : "-"}
                    </div>
                  </div>
                </div>

                {leg.potential_issue && (
                  <div
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      backgroundColor: "var(--color-warning-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-warning)",
                      fontSize: "var(--font-size-xs)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    ⚠ {leg.potential_issue}
                  </div>
                )}

                {leg.coaching_note && (
                  <p
                    className="text-body"
                    style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}
                  >
                    💡 {leg.coaching_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
