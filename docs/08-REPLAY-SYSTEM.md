# Replay System

## Goal
Make a completed training session replayable like a video.

## UI
- map canvas
- moving athlete marker
- route trail
- controls
- timeline
- play/pause
- playback speed
- seek
- jump to CP
- optional follow-camera
- optional reference route

## Playback
Use timestamps to interpolate marker position smoothly. Do not alter the underlying raw GPS data.

## Events
Timeline events:
- start
- control found
- pause/resume
- potential deviation
- finish

## Performance
Do not render thousands of DOM elements. Use map layers/canvas/WebGL-friendly rendering. Load only the relevant session data.

## Reference comparison
A reference route is optional. Never imply it is the mathematically optimal route unless the route-generation/optimization method actually establishes that claim. Prefer labels such as "reference route" or "shorter candidate route".
