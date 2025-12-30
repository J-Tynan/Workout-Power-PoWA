# [WIP] Workout Power PWA

A modern, open-source, installable Progressive Web App (PWA) revival of the famous Scientific 7-Minute Workout originally published by The New York Times and based on the 2013 ACSM paper.

This app delivers high-intensity circuit training (HICT) using only body weight, a chair, and a wall — no gym required. It is designed to be simple, beautiful, and effective, with multiple workout variations and full offline support.

It is being built with a focus on a clean UI, offline support, and a timer experience that works well on phones in portrait/landscape.

## Features

- Workout list + preview (horizontal carousel)
- Timer experience
  - Pre-workout countdown
  - Work + rest phases
  - Tap-anywhere pause/resume
  - "Up next" panel
- Voice + sound guidance
  - Text-to-speech announcements (Web Speech API)
  - Beeps (Web Audio API)
- Options (persisted)
  - Rest duration
  - Pre-workout countdown seconds
  - Sounds toggle
  - Voice volume + beep volume
  - Celebrations toggle
  - Vibration toggle (where supported)
  - Screen wake lock toggle (where supported)
- Theming
  - Theme: System / Light / Dark
  - Light accent colour picker (consistent, non-blinding light background)
- Celebrations
  - Confetti + fireworks on completion (and testable from Options)
  - Automatically disabled when "Reduce motion" is enabled
- PWA
  - Installable
  - Offline after first load (service worker)

- Built with simplicity
  - Vanilla HTML/CSS/JS (no heavy frameworks)
  - Tailwind via CDN
  - JSON-based workout data in `data/workouts/`

## Screenshots

Coming soon.

## Install (as an app)

1. Open the app in your browser.
2. Install it:
   - Edge/Chrome (desktop): Install icon in the address bar
   - Android: menu -> Install app
   - iOS: Share -> Add to Home Screen
3. Launch from your home screen/start menu.

## Development / local testing

This repo is static files (no build step required).

Use a local server (service workers generally do not behave correctly via `file://`). Examples:

- Python: `python -m http.server 5173`
- Node: `npx serve .`

Then open `http://localhost:5173`.

## Workout data

- Workouts live in `data/workouts/`
- The list is in `data/workouts/index.json`

## Notes / troubleshooting

- Celebrations do not run: If your OS/browser has "Reduce motion" enabled, celebrations intentionally will not play.
- Wake Lock: Only works on supported browsers/devices (and typically only when the page is visible).
- Voice guidance: Text-to-speech availability and voice selection vary by platform/browser.

## Tech

- Vanilla HTML/CSS/JS
- Tailwind via CDN (colors driven by CSS variables)
- Web APIs: Service Worker, Web Speech, Web Audio, Screen Wake Lock (when available)

## License
MIT License — free to use, modify, and share.
