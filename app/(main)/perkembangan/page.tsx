"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, formatDistance } from "@/lib/geo";
import type { TrainingSession } from "@/types/database";

export default function PerkembanganPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("training_sessions")
          .select("*")
          .eq("status", "finished")
          .order("started_at", { ascending: false });

        if (!error && data) {
          setSessions(data as TrainingSession[]);
        }
      } catch {
        // Offline / fallback
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const totalSessions = sessions.length;
  const totalDistanceM = sessions.reduce((acc, s) => acc + (s.distance_m || 0), 0);
  const totalDurationS = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="text-title">Perkembangan</h1>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="flex-center" style={{ padding: "var(--space-16)" }}>
            <div className="spinner" />
          </div>
        ) : totalSessions === 0 ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="empty-state-icon"
            >
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
            <h2 className="empty-state-title">Belum Ada Data</h2>
            <p className="empty-state-description">
              Selesaikan beberapa sesi latihan untuk melihat perkembangan Anda.
            </p>
          </div>
        ) : (
          <div>
            {/* Stat Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-3)",
                marginBottom: "var(--space-6)",
              }}
            >
              <div className="card">
                <span className="text-label">Total Sesi</span>
                <div className="text-metric" style={{ marginTop: "var(--space-1)" }}>
                  {totalSessions}
                </div>
                <span className="text-helper">sesi diselesaikan</span>
              </div>

              <div className="card">
                <span className="text-label">Total Jarak</span>
                <div className="text-metric" style={{ marginTop: "var(--space-1)" }}>
                  {formatDistance(totalDistanceM)}
                </div>
                <span className="text-helper">navigasi lapangan</span>
              </div>

              <div className="card" style={{ gridColumn: "span 2" }}>
                <span className="text-label">Total Waktu Latihan</span>
                <div className="text-metric" style={{ marginTop: "var(--space-1)" }}>
                  {formatDuration(totalDurationS)}
                </div>
                <span className="text-helper">waktu bergerak di area latihan</span>
              </div>
            </div>

            <h2 className="text-label" style={{ marginBottom: "var(--space-3)" }}>
              Riwayat Sesi
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {sessions.map((s) => (
                <div key={s.id} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    <span className="text-body" style={{ fontWeight: 700 }}>
                      Sesi {new Date(s.started_at || s.created_at).toLocaleDateString("id-ID")}
                    </span>
                    <span className="text-body" style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                      {s.duration_seconds ? formatDuration(s.duration_seconds) : "—"}
                    </span>
                  </div>
                  <div className="text-helper">
                    Jarak: {s.distance_m ? formatDistance(s.distance_m) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
