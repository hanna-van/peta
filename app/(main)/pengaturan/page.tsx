"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";

/**
 * Pengaturan (Settings) — user preferences and account management.
 */
export default function PengaturanPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      <div className="page-header">
        <h1 className="text-title">Pengaturan</h1>
      </div>

      <div className="page-content">
        {/* Account section */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h2
            className="text-label"
            style={{ marginBottom: "var(--space-3)" }}
          >
            Akun
          </h2>
          <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <div className="text-body" style={{ fontWeight: 600 }}>
              {user?.user_metadata?.display_name || user?.email || "—"}
            </div>
            <div
              className="text-helper"
              style={{ marginTop: "var(--space-1)" }}
            >
              {user?.email}
            </div>
          </div>
        </div>

        {/* App info */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h2
            className="text-label"
            style={{ marginBottom: "var(--space-3)" }}
          >
            Aplikasi
          </h2>
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span className="text-body">Versi</span>
              <span className="text-helper">0.1.0</span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          className="btn btn-secondary btn-full"
          onClick={handleSignOut}
          style={{ color: "var(--color-error)" }}
        >
          Keluar
        </button>
      </div>
    </>
  );
}
