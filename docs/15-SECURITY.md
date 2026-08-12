# Security & Privacy

## Supabase
- Enable RLS on user-owned tables.
- Browser uses only the public anon/publishable key.
- Service-role key is server-only.
- Validate ownership on every mutation.

## Location privacy
GPS tracks reveal precise movement. Default visibility is private.

Never:
- expose private tracks in public APIs,
- put coordinates in analytics logs,
- log full tracks unnecessarily,
- embed service secrets in client bundles.

## Uploads
Validate file type/size for imported maps. Store user files in controlled Supabase Storage buckets with appropriate policies.

## Authentication
Protect private routes. Handle session expiry cleanly.

## Security headers
Configure appropriate production headers where compatible with map rendering and external assets.

## Dependency hygiene
Keep dependencies current enough for security, but pin/lock versions through the package manager. Run audits as part of maintenance.
