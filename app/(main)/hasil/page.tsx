"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, formatDistance } from "@/lib/geo";
import type { TrainingSession } from "@/types/database";

export default function HasilPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("training_sessions")
          .select("*")
          .order("started_at", { ascending: false });

        if (!error && data) {
          setSessions(data as TrainingSession[]);
        }
      } catch {
        // Supabase offline/fallback
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="text-title">Hasil Latihan</h1>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="flex-center" style={{ padding: "var(--space-16)" }}>
            <div className="spinner" />
          </div>
        ) : sessions.length === 0 ? (
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <h2 className="empty-state-title">Belum Ada Hasil</h2>
            <p className="empty-state-description">
              Selesaikan latihan pertama Anda untuk melihat hasil dan analisis di sini.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/hasil/${s.id}`}
                className="card card-interactive"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  <span className="text-body" style={{ fontWeight: 700 }}>
                    Sesi {new Date(s.started_at || s.created_at).toLocaleDateString("id-ID")}
                  </span>
                  <span
                    className={`badge ${
                      s.status === "finished" ? "badge-success" : "badge-neutral"
                    }`}
                  >
                    {s.status === "finished" ? "Selesai" : s.status}
                  </span>
                </div>

                <div className="text-helper">
                  Waktu: {s.duration_seconds ? formatDuration(s.duration_seconds) : "—"} • Jarak:{" "}
                  {s.distance_m ? formatDistance(s.distance_m) : "—"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
