# [WIP] Workout Power

Workout Power is a lightweight, focused fitness Progressive Web App (PWA) designed to work reliably on both mobile and desktop platforms. The project prioritizes clarity, performance, and daily usability over feature bloat or visual excess.

The goal is to provide a calm, predictable workout experience that can be used every day without friction.

---

## Features (v0.1)

- Mobile-first, landscape-safe layout
- Data-driven workouts (test workout and two 7-minute routines)
- Reliable workout timer with pause and resume
- Text-to-speech exercise cues
- Global sound on/off toggle
- Voice selection (automatic or manual)
- Light and dark themes controlled by the user
- Centralized state management
- Persistent user settings
- Installable Progressive Web App

---

## Technology Stack

- Vanilla JavaScript
- Vite (development server and build tool)
- Tailwind CSS
- DaisyUI
- Heroicons
- Web Speech API

No frontend framework is used. The architecture favors explicit state flow and predictable behavior.

---

## Project Structure

src/
app/
bootstrap.js        App startup and initialization
routes.js           Screen switching
state.js            Single source of truth
storage.js          Local storage wrapper
domain/
workouts/           Workout definitions
engine/             Workout runner and controller
audio/              Text-to-speech logic
ui/
layout/             Application shell
screens/            Home, Workout, and Settings screens
components/         Reusable UI components
styles/
app.css             Tailwind and DaisyUI entry point

---

## Screens

### Home
- Workout selection carousel
- Start workout button
- Access to settings

### Workout
- Current exercise display
- Countdown timer
- Pause and resume controls
- Tap-anywhere pause support

### Settings
- Theme toggle (light or dark)
- Sound on/off toggle
- Voice selection
- Scrollable layout with no modals

---

## State Flow
UI -> State -> Engine

- The UI requests changes
- State describes the application
- The engine executes timers and audio

The engine never touches the DOM. The UI never mutates state directly.

---

## Persistence

Persisted settings:
- Theme
- Sound enabled
- Voice selection

Not persisted:
- Active workouts
- Timers
- Pause state

Reloading the app during a workout resets cleanly by design.

---

## Versioning
v0.1: Stable, usable, minimal
Future versions will only add features that preserve simplicity

---

## License
MIT

---

## Acknowledgements
- Tailwind CSS
- DaisyUI
- Heroicons

- Web Speech API
