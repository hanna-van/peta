"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { CourseLayer } from "@/components/map/CourseLayer";
import { CourseService } from "@/features/courses/CourseService";
import { GpsService } from "@/features/training/GpsService";
import { TrainingStore } from "@/features/training/TrainingStore";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, routeDistance, distanceMeters } from "@/lib/geo";
import type { Course, CourseControl } from "@/types/database";
import type { GpsSample, LocalSessionState, ConnectionStatus } from "@/types/training";
import type { LatLng } from "@/types/map";
import type maplibregl from "maplibre-gl";

export default function ActiveTrainingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [controls, setControls] = useState<CourseControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Session state
  const [sessionState, setSessionState] = useState<LocalSessionState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentCpIndex, setCurrentCpIndex] = useState<number>(1); // CP #1 is first target
  const [showDescriptions, setShowDescriptions] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("online");
  const [currentGps, setCurrentGps] = useState<GpsSample | null>(null);
  
  const [downloadProgress, setDownloadProgress] = useState<import("@/features/maps/TileDownloader").DownloadProgress | null>(null);

  const gpsServiceRef = useRef<GpsService | null>(null);
  const isPunchingRef = useRef(false);

  // 1. Fetch course & init/restore session
  useEffect(() => {
    async function loadSession() {
      const { course: c, controls: ctrls } =
        await CourseService.getCourseWithControls(courseId);

      if (!c || ctrls.length === 0) {
        router.push("/latihan");
        return;
      }

      setCourse(c);
      setControls(ctrls);

      // Check if session exists in DB or create a new training_session record
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      // Check existing local session or create remote session
      let local = TrainingStore.getLocalSession();
      if (!local || local.courseId !== courseId) {
        const { data: remoteSession } = await supabase
          .from("training_sessions")
          .insert({
            user_id: userData.user.id,
            course_id: courseId,
            status: "ready",
          })
          .select()
          .single();

        const sId = remoteSession?.id || crypto.randomUUID();
        local = TrainingStore.initSession(sId, courseId);
      }

      setSessionState(local);
      if (local.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(local.startedAt).getTime()) / 1000);
        setElapsedSeconds(Math.max(0, elapsed));
      }

      setLoading(false);
    }
    loadSession();
  }, [courseId, router]);

  // 2. Start Countdown -> Active
  const handleStartCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> Start active session!
      setCountdown(null);
      const nowIso = new Date().toISOString();
      setSessionState((prev) => {
        if (!prev) return null;
        const nextState = {
          ...prev,
          status: "active" as const,
          startedAt: nowIso,
        };
        TrainingStore.saveLocalSession(nextState);
        TrainingStore.updateRemoteSessionStatus(prev.sessionId, "active", {
          started_at: nowIso,
        });
        return nextState;
      });
    }
  }, [countdown]);

  // 3. Stopwatch timer effect during active session
  useEffect(() => {
    if (sessionState?.status !== "active") return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionState?.status]);

  // 4. GPS tracking effect
  const handleNewGpsSample = useCallback((sample: GpsSample) => {
    setCurrentGps(sample);

    setSessionState((prev) => {
      if (!prev || prev.status !== "active") return prev;

      const nextSamples = [...prev.gpsSamples, sample];
      const nextPending = [...prev.pendingGpsSamples, sample];

      const updated = {
        ...prev,
        gpsSamples: nextSamples,
        pendingGpsSamples: nextPending,
      };

      TrainingStore.saveLocalSession(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!["ready", "countdown", "active"].includes(sessionState?.status || "")) return;

    const gps = new GpsService();
    gpsServiceRef.current = gps;
    gps.startTracking(handleNewGpsSample);

    return () => {
      gps.stopTracking();
    };
  }, [sessionState?.status, handleNewGpsSample]);

  // Periodic offline data sync to Supabase
  useEffect(() => {
    if (!sessionState) return;
    const interval = setInterval(async () => {
      const { updatedState, connectionStatus: conn } =
        await TrainingStore.syncPendingData(sessionState);
      setSessionState(updatedState);
      setConnectionStatus(conn);
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionState]);

  // 5. Confirm Control Visit
  const handleConfirmControl = async (method: "manual" | "proximity" | "auto" = "manual") => {
    if (!sessionState || !currentGps) return;

    const targetControl = controls[currentCpIndex]; // controls[0] is Start, [1..N] are CPs
    if (!targetControl) return;

    const visitTime = new Date().toISOString();

    const visit = {
      controlId: targetControl.id,
      controlSequence: targetControl.sequence,
      confirmedAt: visitTime,
      method: method,
      latitude: currentGps.latitude,
      longitude: currentGps.longitude,
    };

    // Haptic & Audio feedback outdoor
    if (typeof window !== "undefined") {
      if ("vibrate" in navigator) {
        if (method === "auto") {
          navigator.vibrate([200, 100, 200, 100, 500]); // Distinct pattern for auto-punch
        } else {
          navigator.vibrate([100, 50, 100]);
        }
      }
      
      // Audio Punching
      if ("speechSynthesis" in window) {
        const msgText = currentCpIndex === controls.length - 2 ? "Finish OK" : `Pos ${currentCpIndex} OK`;
        const msg = new SpeechSynthesisUtterance(msgText);
        msg.lang = "id-ID";
        msg.rate = 1.1;
        window.speechSynthesis.speak(msg);
      }
    }

    const totalCps = controls.length - 2; // Exclude start and finish

    setSessionState((prev) => {
      if (!prev) return null;
      const nextVisits = [...prev.controlVisits, visit];
      const nextPendingVisits = [...prev.pendingControlVisits, visit];

      const updated = {
        ...prev,
        controlVisits: nextVisits,
        pendingControlVisits: nextPendingVisits,
      };
      TrainingStore.saveLocalSession(updated);
      return updated;
    });

    if (currentCpIndex < totalCps) {
      setCurrentCpIndex((prev) => prev + 1);
    } else {
      // Reached final CP -> Finish training!
      await handleFinishTraining();
    }
  };

  // Auto-Punching Logic (15m radius)
  useEffect(() => {
    if (sessionState?.status !== "active" || !currentGps || isPunchingRef.current) return;

    const targetControl = controls[currentCpIndex];
    if (!targetControl) return;

    const distToCp = distanceMeters(
      { lat: currentGps.latitude, lng: currentGps.longitude },
      { lat: targetControl.point.coordinates[1], lng: targetControl.point.coordinates[0] }
    );

    if (distToCp <= 15) {
      isPunchingRef.current = true;
      handleConfirmControl("auto").finally(() => {
        setTimeout(() => {
          isPunchingRef.current = false;
        }, 3000); // 3 sec debounce
      });
    }
  }, [currentGps, currentCpIndex, controls, sessionState?.status]);

  // 6. Finish Training Session
  const handleFinishTraining = async () => {
    if (!sessionState) return;

    gpsServiceRef.current?.stopTracking();

    const finishTime = new Date().toISOString();
    const totalDist = routeDistance(
      sessionState.gpsSamples.map((s) => ({ lat: s.latitude, lng: s.longitude }))
    );

    const updatedState = {
      ...sessionState,
      status: "finished" as const,
    };

    // Sync all remaining pending data
    await TrainingStore.syncPendingData(updatedState);

    // Update session record on Supabase
    await TrainingStore.updateRemoteSessionStatus(sessionState.sessionId, "finished", {
      finished_at: finishTime,
      duration_seconds: elapsedSeconds,
      distance_m: totalDist,
    });

    TrainingStore.clearLocalSession();
    router.push(`/hasil/${sessionState.sessionId}`);
  };

  const handleDownloadMap = async () => {
    if (!controls.length) return;
    
    // Calculate bounding box of controls with a small buffer
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    controls.forEach(c => {
      const lat = c.point.coordinates[1];
      const lng = c.point.coordinates[0];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
    
    // Add ~500m buffer
    const buffer = 0.005; 
    
    const { TileDownloader } = await import("@/features/maps/TileDownloader");
    await TileDownloader.downloadArea(
      minLng - buffer,
      minLat - buffer,
      maxLng + buffer,
      maxLat + buffer,
      (progress) => setDownloadProgress(progress)
    );
  };

  if (loading || !course || !sessionState) {
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

  const totalCps = controls.length - 2;
  const isLastCp = currentCpIndex >= totalCps;

  const gpsAccuracy = currentGps?.accuracy || 999;
  const gpsBadgeClass = gpsAccuracy <= 15 ? "badge-success" : gpsAccuracy <= 50 ? "badge-warning" : "badge-error";
  const gpsText = gpsAccuracy <= 15 ? "GPS Kuat" : gpsAccuracy <= 50 ? "GPS Sedang" : "Mencari GPS";

  const centerLatLng = controls.length > 0
    ? { lat: controls[0].point.coordinates[1], lng: controls[0].point.coordinates[0] }
    : undefined;

  return (
    <div style={{ height: "100dvh", width: "100vw", position: "relative" }}>
      {/* Fullscreen Map Canvas */}
      <MapView
        initialCenter={centerLatLng}
        initialZoom={16}
        onMapReady={setMapInstance}
        showUserLocation
        fullscreen
      >
        <CourseLayer
          map={mapInstance}
          controls={generatedControls}
          activeControlSequence={currentCpIndex}
        />
      </MapView>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(10, 14, 23, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "6rem",
              fontWeight: 800,
              color: "var(--color-accent)",
              animation: "pulse 0.8s ease infinite",
            }}
          >
            {countdown > 0 ? countdown : "MULAI!"}
          </div>
        </div>
      )}

      {/* Top HUD Overlay (Timer, CP Counter, Sync Status) */}
      <div 
        className="training-hud" 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "var(--space-2)", 
          alignItems: "flex-start",
          paddingRight: "60px" // Leave space for Geolocate control
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", flex: 1 }}>
          <div className="training-hud-chip">
            <span className="text-metric" style={{ fontSize: "1.5rem" }}>
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="training-hud-chip">
            <span className="badge badge-warning" style={{ fontSize: "0.875rem" }}>
              Pos {currentCpIndex} / {totalCps}
            </span>
          </div>

          <div className="training-hud-chip">
            <span className={`badge ${gpsBadgeClass}`} style={{ fontSize: "0.875rem" }}>
              {gpsText}
            </span>
          </div>

          <div className="training-hud-chip">
            <span
              className={`badge ${connectionStatus === "online" ? "badge-success" : "badge-neutral"}`}
              style={{ fontSize: "0.875rem" }}
            >
              {connectionStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: "0 var(--space-3)", borderRadius: "var(--radius-full)", alignSelf: "flex-start", marginTop: "var(--space-1)" }}
          onClick={() => setShowDescriptions(!showDescriptions)}
        >
          {showDescriptions ? "Tutup Deskripsi" : "📋 Deskripsi Pos"}
        </button>
      </div>

      {/* Control Descriptions IOF Sidebar */}
      {showDescriptions && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: "var(--space-4)",
            width: 280,
            maxHeight: "calc(100vh - 200px)",
            backgroundColor: "rgba(10, 14, 23, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid #D400D4",
            borderRadius: "var(--radius-md)",
            zIndex: 80,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ backgroundColor: "#D400D4", padding: "var(--space-2)", textAlign: "center" }}>
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: "0.9rem" }}>Deskripsi CP (IOF)</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
                <th style={{ padding: "var(--space-2)", textAlign: "center" }}>No</th>
                <th style={{ padding: "var(--space-2)", textAlign: "center" }}>Kode</th>
                <th style={{ padding: "var(--space-2)", textAlign: "left" }}>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((c) => {
                const isStart = c.sequence === 0;
                const isFinish = c.sequence === controls.length - 1;
                const isActive = c.sequence === currentCpIndex;
                const noStr = isStart ? "S" : isFinish ? "F" : String(c.sequence);
                const codeStr = isStart ? "Start" : isFinish ? "Finish" : `CP${c.sequence}`;
                const descStr = (c.metadata?.rationale as string) || (c.feature_type ? c.feature_type.replace("_", " ") : "-");
                
                return (
                  <tr 
                    key={c.id} 
                    style={{ 
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: isActive ? "rgba(212, 0, 212, 0.2)" : "transparent",
                      color: isActive ? "#FF5722" : "inherit"
                    }}
                  >
                    <td style={{ padding: "var(--space-2)", textAlign: "center", fontWeight: "bold", color: "#D400D4" }}>{noStr}</td>
                    <td style={{ padding: "var(--space-2)", textAlign: "center", fontWeight: 600 }}>{codeStr}</td>
                    <td style={{ padding: "var(--space-2)", textAlign: "left", textTransform: "capitalize" }}>{descStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Primary Action Button */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom) + var(--space-4))", // Better spacing for mobile navigation bars
          left: "var(--space-4)",
          right: "var(--space-4)",
          zIndex: 90, // Ensure it's above maplibre attributions
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {sessionState.status === "ready" ? (
          <>
            <button
              className="btn btn-secondary btn-full"
              onClick={handleDownloadMap}
              disabled={downloadProgress?.status === "downloading"}
              style={{ fontSize: "0.95rem", height: 48, backgroundColor: "rgba(10,14,23,0.95)", backdropFilter: "blur(8px)" }}
            >
              {downloadProgress?.status === "downloading" 
                ? `⬇ Mendownload Peta Offline... (${downloadProgress.downloaded}/${downloadProgress.total})` 
                : downloadProgress?.status === "complete" 
                  ? "✅ Peta Offline Tersimpan" 
                  : "⬇ Download Peta Area (Offline)"}
            </button>
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleStartCountdown}
              style={{ fontSize: "1.25rem", height: 56, boxShadow: "var(--shadow-xl)" }}
            >
              ▶ Mulai Latihan
            </button>
          </>
        ) : sessionState.status === "active" ? (
          <button
            className={`btn ${isLastCp ? "btn-danger" : "btn-primary"} btn-lg btn-full`}
            onClick={() => handleConfirmControl("manual")}
            style={{ fontSize: "1.25rem", height: 60, boxShadow: "var(--shadow-xl)" }}
          >
            {isLastCp ? "✔ Pos Terakhir & Selesai!" : `✔ Confirm Pos CP ${currentCpIndex}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
