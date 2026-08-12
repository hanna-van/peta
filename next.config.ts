import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/[abc]\.tile\.opentopomap\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "offline-map-tiles",
          expiration: {
            maxEntries: 10000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
