# Implementation Roadmap

## Phase 0 — Foundation
- initialize Next.js TypeScript project
- configure lint/format/type checking
- connect Supabase
- create migrations
- enable PostGIS
- implement auth
- configure Vercel project
- create `.env.example`

Definition: authenticated app builds and deploys.

## Phase 1 — Map Foundation
- map viewer
- map area CRUD
- MapLibre
- map provider abstraction
- basic geographic data ingestion
- map feature model
- responsive map UI

Definition: user can create/open a training area and inspect its map.

## Phase 2 — Course Generator
- candidate generation
- difficulty scoring
- 10-control generation
- seed/version storage
- course validation
- manual editing

Definition: user can generate and edit a valid training course.

## Phase 3 — Training
- briefing
- countdown
- GPS permission/status
- GPS recording
- control confirmation
- finish/recovery
- local queue

Definition: user can complete a real outdoor session and recover data after interruption.

## Phase 4 — Replay
- session timeline
- animated route
- playback controls
- follow camera
- control events
- leg navigation

Definition: user can replay a completed session smoothly.

## Phase 5 — Analysis
- metrics
- leg splits
- GPS quality handling
- potential deviation detection
- route/reference comparison
- concise coaching feedback

Definition: user can understand what happened and where time may have been lost.

## Phase 6 — Progress
- history
- trends
- comparable-session analysis
- personal bests

## Phase 7 — Advanced
- memory mode
- route-choice drills
- adaptive coach
- ghost runner
- offline map packages
- video export

## Deployment checklist
- Supabase production project configured
- migrations applied
- RLS verified
- environment variables configured in Vercel
- production build passes
- domain configured if applicable
- error states tested on mobile
- GPS tested outdoors
- offline/reconnect tested
- no secrets in repository
