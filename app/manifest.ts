import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orienteering Tracker",
    short_name: "O-Tracker",
    description: "Platform Latihan Orienteering & Navigasi",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#FF5722",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
