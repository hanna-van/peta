"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MapArea } from "@/types/database";

export const dynamic = "force-dynamic";

export default function PetaPage() {
  const [maps, setMaps] = useState<MapArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("map_areas")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setMaps(data as MapArea[]);
        }
      } catch {
        // Supabase may not be configured yet
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="text-title">Peta Saya</h1>
        <Link href="/peta/tambah" className="btn btn-primary btn-sm">
          + Tambah Peta
        </Link>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="flex-center" style={{ padding: "var(--space-16)" }}>
            <div className="spinner" />
          </div>
        ) : maps.length === 0 ? (
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
              <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <h2 className="empty-state-title">Belum Ada Peta</h2>
            <p className="empty-state-description">
              Buat peta area latihan pertama Anda untuk mulai berlatih orienteering.
            </p>
            <Link href="/peta/tambah" className="btn btn-primary" style={{ marginTop: "var(--space-2)" }}>
              + Tambah Peta Baru
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {maps.map((map) => (
              <Link
                key={map.id}
                href={`/peta/${map.id}`}
                className="card card-interactive"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="text-body" style={{ fontWeight: 600 }}>
                  {map.name}
                </div>
                {map.description && (
                  <div
                    className="text-helper"
                    style={{ marginTop: "var(--space-1)" }}
                  >
                    {map.description}
                  </div>
                )}
                <div className="text-helper" style={{ marginTop: "var(--space-2)" }}>
                  <span className="badge badge-neutral">{map.source_type}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
