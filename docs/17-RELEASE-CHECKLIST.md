# Release Checklist

## Product
- [ ] Main flow works end-to-end
- [ ] Indonesian UI is understandable
- [ ] No ambiguous primary actions
- [ ] Empty/loading/error states exist
- [ ] Mobile layout tested

## Map
- [ ] Map loads on mobile
- [ ] Controls are legible
- [ ] GPS marker is clear
- [ ] Map provider attribution/license requirements satisfied
- [ ] No unsupported geographic claims

## Course
- [ ] 10 CP generation works
- [ ] Course is reproducible from seed
- [ ] Invalid courses are rejected
- [ ] Manual editing persists

## Training
- [ ] GPS permission flow works
- [ ] Low accuracy warning works
- [ ] GPS data persists
- [ ] Interrupted sessions recover
- [ ] Control confirmations persist

## Replay
- [ ] Play/pause works
- [ ] Seeking works
- [ ] Playback speed works
- [ ] Route animation is smooth
- [ ] Control events align with timestamps

## Analysis
- [ ] Raw GPS remains preserved
- [ ] Low-quality points handled
- [ ] Potential errors have confidence
- [ ] Estimates are labeled as estimates
- [ ] Per-leg analysis works

## Security
- [ ] RLS enabled
- [ ] Service-role key is server-only
- [ ] Private tracks cannot be read by other users
- [ ] Upload validation exists
- [ ] No secrets committed

## Deployment
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] production build
- [ ] Vercel deployment
- [ ] Supabase migrations applied
- [ ] production smoke test
