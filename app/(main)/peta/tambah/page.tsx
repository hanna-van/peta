"use client";

import dynamic from "next/dynamic";

const TambahPetaContent = dynamic(() => import("./TambahPetaContent"), {
  ssr: false,
  loading: () => (
    <div className="page flex-center" style={{ minHeight: "100dvh" }}>
      <div className="spinner" />
    </div>
  ),
});

export default function TambahPetaPage() {
  return <TambahPetaContent />;
}
