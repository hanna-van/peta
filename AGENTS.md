# AGENTS.md — Orienteering Training & Analysis Platform

## Mission
Build a production-ready, mobile-first personal orienteering training and analysis platform. It must help an athlete create/select a training map, generate a challenging course, perform a GPS-tracked training session, replay the session like a video, and understand where time/navigation errors occurred.

The product is an athlete tool, not a generic GIS dashboard and not merely a fitness tracker.

## Non-negotiable product rules
1. The map is the primary interface.
2. Mobile-first is mandatory because the application is used outdoors.
3. UI language must be clear Indonesian unless a technical label genuinely benefits from English.
4. Never expose unnecessary GIS/developer jargon to end users.
5. One screen should have one obvious primary action.
6. Never invent geographic data or claim uncertain geographic information is verified.
7. Automatically generated maps are training maps, not automatically official competition maps.
8. GPS is noisy. Never interpret a single inaccurate GPS jump as a confirmed navigation error.
9. Training must remain usable when connectivity is poor; design for offline-capable data flows.
10. Preserve reproducibility: generated courses must store a seed and configuration.
11. Do not replace real functionality with mock dashboards, fake analytics, or hard-coded map data in production.
12. Never expose Supabase service-role keys to the browser.
13. Use Row Level Security for user-owned data.
14. Validate important spatial operations on the server.
15. Keep secrets in environment variables and provide `.env.example`.

## Required stack
- Next.js + TypeScript
- Supabase PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Storage where appropriate
- MapLibre GL JS for map rendering
- Turf.js for client/server-safe geospatial calculations where appropriate
- Vercel for deployment

## Product flow
Home → Start Training → Select Map → Select Difficulty/CP Count → Briefing → Training → Finish → Result → Replay → Analysis → Progress.

## Core domains
- Map Areas
- Training Maps
- Map Features
- Courses
- Course Controls
- Training Sessions
- GPS Track Points
- Control Visits
- Analysis
- Training History

## Definition of done
A feature is not complete until:
- it works on mobile,
- loading/empty/error states exist,
- permissions and failure states are handled,
- data is persisted correctly,
- no production secrets are exposed,
- TypeScript/build/lint checks pass,
- relevant tests exist,
- documentation is updated,
- deployment configuration is valid.

## Development behavior
Read the relevant `/docs/*.md` before implementing a domain. Prefer small, testable modules. Do not rewrite the architecture without documenting the reason. If an external API/provider is unavailable, implement a clean provider abstraction rather than hard-coding a fake replacement.
