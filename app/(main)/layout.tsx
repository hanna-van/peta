"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { BottomNav } from "@/components/layout/BottomNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Authenticated layout — wraps all main app pages with bottom navigation.
 * Redirects to login if not authenticated.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "100dvh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page">
      {children}
      <BottomNav />
    </div>
  );
}
