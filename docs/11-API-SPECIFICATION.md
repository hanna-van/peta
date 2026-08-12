# API Specification

## Principles
- Validate inputs server-side.
- Return typed, predictable responses.
- Use authenticated user context.
- Never expose service-role credentials.
- Keep provider-specific details behind server modules.

## API domains
### Maps
- create/list/get/update map areas
- import map metadata
- fetch map features
- save custom feature

### Courses
- generate course
- validate course
- update controls
- get course

### Training
- create session
- append/flush GPS samples
- confirm control
- finish session
- recover interrupted session

### Replay
- fetch session replay data
- fetch events
- fetch analysis

### Analysis
- run/re-run analysis
- get leg analysis
- get session summary

## Error format
Return a stable shape such as:
- code
- message
- details
- requestId where useful

Messages intended for users must be translated into clear Indonesian at the UI layer.
