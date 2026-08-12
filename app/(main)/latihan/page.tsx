"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";

export default function LatihanPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <h1 className="text-title">Latihan</h1>
      </div>

      <div className="page-content">
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
            <circle cx="12" cy="12" r="10" />
            <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" />
          </svg>
          <h2 className="empty-state-title">Mulai Latihan Baru</h2>
          <p className="empty-state-description">
            Pilih peta dan buat jalur latihan untuk memulai sesi orienteering pertama Anda.
          </p>
          <Link href="/latihan/baru" className="btn btn-primary btn-lg">
            Mulai Latihan Baru
          </Link>
        </div>
      </div>
    </>
  );
}
