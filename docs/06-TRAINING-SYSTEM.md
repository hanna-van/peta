# Training System

## Session states
`ready → countdown → active → paused/interrupted → finished → processing → analyzed`

## Start
Before starting:
- selected map,
- course,
- CP count,
- difficulty,
- GPS status,
- optional location accuracy warning.

## During training
Record:
- session time,
- GPS samples,
- control confirmations/events,
- session state changes.

The UI should prioritize navigation and avoid unnecessary interactions.

## CP confirmation
A CP may be confirmed by a deliberate user action. Automatic proximity detection can be a future enhancement, but should never silently mark a control as found without clear rules.

## Safety
The system is a training aid. It must not encourage dangerous routes, trespassing, or crossing prohibited areas. Map data is not a substitute for local knowledge and permission.

## Finish
On finish:
- stop active recording,
- persist remaining data,
- calculate basic metrics,
- show result,
- offer Replay immediately.
