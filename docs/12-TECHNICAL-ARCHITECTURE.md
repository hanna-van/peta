# Technical Architecture

## Frontend
Next.js App Router + TypeScript.

Suggested boundaries:
- `app/` routes and pages
- `components/` reusable UI
- `features/` domain modules
- `lib/` infrastructure/providers
- `types/` shared types
- `supabase/` migrations and seed/dev helpers

## Map
MapLibre GL JS. Keep map state isolated from generic React state where possible.

## Backend
Next.js Route Handlers/server actions as appropriate. Heavy processing should be isolated in server modules and can later move to background jobs if required.

## Supabase
- Auth
- PostgreSQL
- PostGIS
- Storage
- RLS

## External data
Create provider interfaces:
- `MapDataProvider`
- `ElevationProvider`
- optional `ImageryProvider`

Implement one provider at a time. Do not couple the entire domain to one vendor.

## Environment variables
Provide `.env.example`. Public client keys may be prefixed appropriately; service-role secrets must remain server-only.

## Deployment
Vercel production deployment from GitHub. Supabase project configured separately. Build must succeed with production environment variables.

## Testing
At minimum:
- course generator unit tests
- geospatial utility tests
- GPS plausibility tests
- analysis tests
- critical UI flow tests
- production build test

## Observability
Log server errors without logging secrets or unnecessary location data. Add request/session IDs where useful.
