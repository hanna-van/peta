# User Flows

## Start a training session
Home → Mulai Latihan → Pilih Peta → Kesulitan → Jumlah CP → Briefing → Mulai.

## Training
Ready → Countdown → Active Map → Detect/Confirm CP → Repeat → Finish → Result.

## Replay
Result → Putar Ulang → Play/Pause → Seek → Jump to CP → Inspect Leg → Analysis.

## Create map
Peta Saya → Tambah Peta → Pilih Lokasi / Import Peta / Survey → Review → Simpan.

## Failure states
- Location denied: explain and offer retry/settings guidance.
- Low accuracy: warn but do not falsely block unless required by the session configuration.
- Lost connectivity: continue local recording where possible; mark pending sync.
- Session interrupted: offer resume/recover if local data exists.
- Missing map data: show a clear provider/data limitation and allow retry or alternate source.

## Important rule
Do not make the user configure technical map/GIS parameters unless they explicitly enter an advanced map-editing flow.
