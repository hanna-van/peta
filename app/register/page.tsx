"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("Email sudah terdaftar. Silakan masuk.");
        } else {
          setError("Gagal mendaftar. Silakan coba lagi.");
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto var(--space-4)",
            borderRadius: "50%",
            background: "var(--color-success-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-success)"
            strokeWidth={2.5}
            width={24}
            height={24}
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <h1 className="text-heading" style={{ marginBottom: "var(--space-2)" }}>
          Pendaftaran Berhasil
        </h1>
        <p
          className="text-body"
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: 320,
            marginBottom: "var(--space-6)",
          }}
        >
          Periksa email Anda untuk konfirmasi, lalu masuk.
        </p>
        <Link href="/login" className="btn btn-primary">
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
          <h1 className="text-heading">Buat Akun</h1>
          <p
            className="text-body"
            style={{
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-2)",
            }}
          >
            Daftar untuk mulai berlatih orienteering
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label
              htmlFor="register-name"
              className="text-label"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Nama
            </label>
            <input
              id="register-name"
              type="text"
              className="input"
              placeholder="Nama Anda"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label
              htmlFor="register-email"
              className="text-label"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className="input"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: "var(--space-6)" }}>
            <label
              htmlFor="register-password"
              className="text-label"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              className="input"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-error-subtle)",
                color: "var(--color-error)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Daftar"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "var(--space-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          Sudah punya akun?{" "}
          <Link
            href="/login"
            style={{ color: "var(--color-accent)", textDecoration: "none" }}
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
