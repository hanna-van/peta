# GPS Tracking

## Data model
A GPS sample should include:
- session_id
- recorded_at
- latitude
- longitude
- altitude when available
- accuracy when available
- speed when available
- heading when available

## Sampling
Use a configurable browser geolocation strategy appropriate for outdoor tracking. Do not assume exact 1-second accuracy. Store actual timestamps.

## Quality
Use accuracy metadata to detect low-confidence samples. Do not over-filter raw data because replay needs fidelity.

## Processing
Maintain:
1. raw track,
2. cleaned/analysis track,
3. derived metrics.

Never overwrite raw observations.

## GPS uncertainty
Analysis must consider accuracy and impossible jumps. Use plausibility checks such as maximum speed and timestamp intervals, but avoid deleting legitimate fast movement without evidence.

## Privacy
Location history is sensitive. Apply strict RLS. Do not expose a user's tracks publicly by default.
