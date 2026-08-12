# Decision Log

## 2026-08-12 — Initial architecture
- Next.js + TypeScript chosen for application.
- Supabase PostgreSQL + PostGIS chosen for persistent geospatial data.
- Supabase Auth chosen for authentication.
- Supabase Storage reserved for map/file assets.
- Vercel chosen for deployment.
- MapLibre GL JS chosen for map rendering.
- Turf.js chosen for common geospatial calculations.
- Product is mobile-first and map-first.
- Replay and analysis are core features, not optional dashboard features.
- Generated maps are explicitly treated as training maps unless imported from a verified source.
