# Orienteering Training & Analysis Platform

A mobile-first, map-centric personal training and analysis platform for orienteering athletes.

## 🚀 Features
- **Map System**: Interactive MapLibre GL JS viewer with OSM Overpass feature ingestion (trails, roads, buildings, water, vegetation).
- **Course Generator**: Reproducible 10-control courses powered by a seeded PRNG and difficulty constraints (`Mudah`, `Sedang`, `Sulit`, `Sangat Sulit`).
- **Active Training HUD**: Real-time GPS tracking with stopwatch timer, CP progress, and offline queueing.
- **Video-Like Replay**: Animated route playback with timeline seek, speed controls (0.25x–8x), and follow-camera.
- **Analysis Engine**: Per-leg splits, GPS quality assessment, and potential route deviation warnings with Indonesian coaching notes.
- **Progress Tracking**: Aggregated session history, total distance, and duration metrics.

## 🛠️ Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, MapLibre GL JS, Turf.js
- **Backend & Database**: Supabase PostgreSQL + PostGIS, Supabase Auth
- **Testing**: Vitest

## 🔑 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run Database Migrations**:
   Execute `supabase/migrations_combined.sql` in your Supabase SQL Editor.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
