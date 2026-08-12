# UX Principles

## Navigation
Primary navigation:
1. Latihan
2. Hasil
3. Perkembangan
4. Peta Saya
5. Pengaturan

Avoid deep navigation.

## Language
Prefer:
- "Mulai Latihan"
- "Pilih Peta"
- "Kesulitan"
- "CP"
- "Waktu"
- "Hasil Latihan"
- "Putar Ulang"
- "Bagian yang Perlu Diperbaiki"

Avoid exposing:
- PostGIS
- spatial index
- geometry
- GPS sampling rate
- API endpoint
- tile provider

## Training screen
The map occupies most of the screen. Keep only essential information visible:
- elapsed time
- control progress
- current position
- next control context
- one primary action

## Error handling
Errors must explain:
1. what happened,
2. whether training can continue,
3. what the user should do.

Never expose raw stack traces or provider error codes.

## Visual identity
The product should feel like a modern navigation instrument, not a generic admin dashboard. Use restrained UI around a strong map canvas. Avoid excessive cards, gradients, glassmorphism, decorative charts, and irrelevant animations.

## Accessibility
- touch targets suitable for outdoor use,
- readable type,
- adequate contrast,
- visible focus states,
- screen-reader labels for controls,
- do not rely on color alone for status.
