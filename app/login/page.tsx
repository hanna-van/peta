"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login")) {
          setError("Email atau password salah.");
        } else {
          setError("Gagal masuk. Silakan coba lagi.");
        }
        return;
      }

      router.push("/latihan");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={28}
              height={28}
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" />
            </svg>
          </div>
          <h1 className="text-heading">Orienteering Training</h1>
          <p
            className="text-body"
            style={{
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-2)",
            }}
          >
            Masuk untuk memulai latihan
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label
              htmlFor="login-email"
              className="text-label"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Email
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="text-label"
              style={{ display: "block", marginBottom: "var(--space-2)" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
            {loading ? <span className="spinner" /> : "Masuk"}
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
          Belum punya akun?{" "}
          <Link
            href="/register"
            style={{ color: "var(--color-accent)", textDecoration: "none" }}
          >
            Daftar
          </Link>
        </p>
      </div>
    </div>
  );
}
