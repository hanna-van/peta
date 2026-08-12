# Offline / Poor Connectivity

## Goal
A training session should remain useful when mobile data becomes unavailable.

## Phase 1
At minimum:
- keep current session state locally,
- queue GPS samples locally,
- queue control events,
- show sync status,
- recover an interrupted session.

## Future offline map package
Download the selected training area's required map resources before leaving connectivity:
- map style/config
- vector/raster resources as permitted
- course
- metadata

Use IndexedDB/service worker architecture appropriate to the chosen map provider and licensing.

## Sync
Use idempotent upload operations. Never duplicate GPS samples during retry.

## UX
Show:
- "Online"
- "Offline — data disimpan di perangkat"
- "Menunggu sinkronisasi"

Do not show raw network errors to the athlete.
