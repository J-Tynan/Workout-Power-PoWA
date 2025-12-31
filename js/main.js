// Main app entry point

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;

const SETTINGS_KEY = 'workoutPowerSettings';

// Light palette map for selectable accents (keys are normalized lowercase).
// Each palette uses a tinted, non-blinding background to keep effects visible.
const LIGHT_THEME_PALETTES = {
  '#16a34a': { accent: '#16a34a', bg: '#e2f2e7', primary: '#c7e3d2', light: '#102418' }, // Green
  '#3b82f6': { accent: '#2563eb', bg: '#e3eaff', primary: '#c7d8ff', light: '#0f1b3a' }, // Blue
  '#f43f5e': { accent: '#f43f5e', bg: '#ffe3ea', primary: '#ffc6d4', light: '#3d0a1b' }, // Rose
  '#10b981': { accent: '#059669', bg: '#dff2e8', primary: '#c2e2d2', light: '#0b2b1f' }, // Emerald
  '#f59e0b': { accent: '#d97706', bg: '#ffe8d2', primary: '#ffd0a6', light: '#3a2405' }, // Amber
  '#6366f1': { accent: '#4c1d95', bg: '#e2e5ff', primary: '#cdd2ff', light: '#11153b' }, // Indigo
  '#14b8a6': { accent: '#0d9488', bg: '#dbf2f4', primary: '#c4e5e9', light: '#0a2c30' }  // Teal
};
const DEFAULT_DARK_PALETTE = { accent: '#16a34a', bg: '#07140d', primary: '#0f3d1a', light: '#c7f9d0' };
const DEFAULT_LIGHT_PALETTE = LIGHT_THEME_PALETTES['#16a34a'];

let wakeLockSentinel = null;
let wakeLockWanted = false;
let wakeLockLastError = null;

let timerTickId = null;
let timerState = null;

function stopActiveTimer() {
  if (timerTickId) {
    clearInterval(timerTickId);
    timerTickId = null;
  }
  timerState = null;
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

function clampNumber(value, min, max) {
  const v = Number(value);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function shouldPlaySounds(settings) {
  return (settings.sounds ?? true) && (clampNumber(settings.beepVolume ?? 100, 0, 100) > 0 || clampNumber(settings.voiceVolume ?? 100, 0, 100) > 0);
}

function playBeep(volumePercent, frequency = 880, durationMs = 90) {
  const vol = clampNumber(volumePercent, 0, 100);
  if (vol <= 0) return;
  if (!('AudioContext' in window) && !('webkitAudioContext' in window)) return;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = playBeep._ctx || (playBeep._ctx = new Ctx());
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = (vol / 100) * 0.15;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

function speak(text, volumePercent) {
  const vol = clampNumber(volumePercent, 0, 100);
  if (vol <= 0) return;
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.volume = vol / 100;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}

function vibrateIfEnabled(settings, pattern) {
  if (!(settings.vibration ?? false)) return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toRgbTripletString(color) {
  if (!color) return null;
  const c = String(color).trim();

  // Already an RGB triplet (e.g. "248 250 252")
  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(c)) return c;

  // Hex forms: #RGB or #RRGGBB
  if (c[0] === '#') {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return `${r} ${g} ${b}`;
  }

  return null;
}

function applyPalette(palette) {
  const root = document.documentElement;
  if (!palette) return;

  const bg = toRgbTripletString(palette.bg);
  const primary = toRgbTripletString(palette.primary);
  const light = toRgbTripletString(palette.light);
  const accent = toRgbTripletString(palette.accent);

  if (bg) root.style.setProperty('--color-bg', bg);
  if (primary) root.style.setProperty('--color-primary', primary);
  if (light) root.style.setProperty('--color-light', light);
  if (accent) root.style.setProperty('--color-accent', accent);
}

function getLightPalette(color) {
  if (!color) return DEFAULT_LIGHT_PALETTE;
  const normalized = color.trim().toLowerCase();
  return LIGHT_THEME_PALETTES[normalized] || DEFAULT_LIGHT_PALETTE;
}

// ApplyTheme: sets data-theme and swaps palette vars. When theme=system, uses prefers-color-scheme.
function applyTheme(theme, lightColor) {
  const root = document.documentElement;
  const t = theme || 'system';

  if (t === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
      applyPalette(DEFAULT_DARK_PALETTE);
    } else {
      root.classList.remove('dark');
      applyPalette(getLightPalette(lightColor));
    }
    return;
  }

  if (t === 'dark') {
    root.classList.add('dark');
    applyPalette(DEFAULT_DARK_PALETTE);
    return;
  }

  if (t === 'light') {
    root.classList.remove('dark');
    applyPalette(getLightPalette(lightColor));
  }
}

function applyThemeFromStorage() {
  const settings = loadSettings();
  applyTheme(settings.theme ?? 'system', settings.lightColor ?? '#16A34A');
}

function wakeLockIsSupported() {
  return !!(navigator && navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
}

function updateWakeLockIndicators() {
  const settings = loadSettings();
  const enabled = settings.wakelock ?? true;

  const indicators = document.querySelectorAll('[data-wakelock-indicator]');
  if (!enabled) {
    indicators.forEach(el => {
      el.classList.add('hidden');
      el.textContent = '';
    });
    return;
  }

  indicators.forEach(el => el.classList.remove('hidden'));

  let text = 'Wake Lock: Off';
  if (!wakeLockWanted) {
    text = 'Wake Lock: Off';
  } else if (!wakeLockIsSupported()) {
    text = 'Wake Lock: Unsupported';
  } else if (wakeLockSentinel) {
    text = 'Wake Lock: Active';
  } else if (wakeLockLastError) {
    text = 'Wake Lock: Enabled (blocked)';
  } else {
    text = 'Wake Lock: Enabled';
  }

  indicators.forEach(el => {
    el.textContent = text;
  });
}

async function requestWakeLockIfNeeded() {
  if (!wakeLockWanted) {
    updateWakeLockIndicators();
    return;
  }

  const settings = loadSettings();
  const enabled = settings.wakelock ?? true;
  if (!enabled) {
    await releaseWakeLock();
    updateWakeLockIndicators();
    return;
  }

  if (!wakeLockIsSupported()) {
    updateWakeLockIndicators();
    return;
  }

  if (wakeLockSentinel) {
    updateWakeLockIndicators();
    return;
  }

  if (document.visibilityState !== 'visible') {
    updateWakeLockIndicators();
    return;
  }

  try {
    wakeLockLastError = null;
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      updateWakeLockIndicators();
      if (wakeLockWanted && document.visibilityState === 'visible') {
        requestWakeLockIfNeeded();
      }
    });
  } catch (err) {
    wakeLockLastError = err;
    wakeLockSentinel = null;
    console.warn('Wake Lock request failed:', err);
  }

  updateWakeLockIndicators();
}

async function releaseWakeLock() {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch (err) {
    console.warn('Wake Lock release failed:', err);
  } finally {
    wakeLockSentinel = null;
  }
}

function setWakeLockWanted(nextWanted) {
  wakeLockWanted = !!nextWanted;
  if (!wakeLockWanted) {
    wakeLockLastError = null;
    releaseWakeLock();
  }
  updateWakeLockIndicators();
  requestWakeLockIfNeeded();
}

// React to OS/browser scheme changes only when user chose Theme=System.
function handleSystemThemeChange() {
  const settings = loadSettings();
  if ((settings.theme ?? 'system') !== 'system') return;
  applyTheme('system', settings.lightColor ?? '#16A34A');
}

const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
if (colorSchemeQuery.addEventListener) {
  colorSchemeQuery.addEventListener('change', handleSystemThemeChange);
} else if (colorSchemeQuery.addListener) {
  colorSchemeQuery.addListener(handleSystemThemeChange);
}

document.addEventListener('visibilitychange', () => {
  if (!wakeLockWanted) return;
  if (document.visibilityState === 'visible') {
    requestWakeLockIfNeeded();
  } else {
    releaseWakeLock();
    updateWakeLockIndicators();
  }
});

// Namespace for global functions
window.WorkoutApp = {};

// History state management
async function loadWorkoutList() {
  try {
    stopActiveTimer();
    setWakeLockWanted(false);
    const response = await fetch('data/workouts/index.json');
    const workouts = await response.json();

    app.innerHTML = `
      <div class="p-6 max-w-4xl mx-auto text-center flex flex-col h-full min-h-0">
        <div class="flex justify-between items-center mb-6 flex-none">
          <h1 class="text-4xl md:text-6xl font-bold">Workout Power PWA</h1>
          <button id="options-btn" class="text-xl text-light underline" aria-label="Options">
            Options
          </button>
        </div>
        <p class="text-light text-xl opacity-90 text-center mb-8 flex-none">Choose a workout to begin</p>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6" id="workout-list-grid"></div>
        </div>
      </div>
    `;

    // Add event listeners for options button
    document.getElementById('options-btn').addEventListener('click', () => window.WorkoutApp.loadOptions());

    // Render workout buttons with safe textContent
    const grid = document.getElementById('workout-list-grid');
    workouts.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'bg-primary hover:bg-accent transition-all rounded-2xl p-6 shadow-xl hover:shadow-2xl';
      btn.setAttribute('aria-label', `Preview workout: ${w.name}`);
      btn.addEventListener('click', () => window.WorkoutApp.loadWorkoutPreview(w.filename));
      const h2 = document.createElement('h2');
      h2.className = 'text-2xl font-bold mb-2';
      h2.textContent = w.name;
      const p = document.createElement('p');
      p.className = 'text-light text-base opacity-90';
      p.textContent = w.description;
      btn.appendChild(h2);
      btn.appendChild(p);
      grid.appendChild(btn);
    });

    history.replaceState({ view: 'menu' }, '', '#menu');
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workouts: ${err.message}</p>`;
    console.error(err);
  }
}

async function loadWorkoutPreview(filename) {
  try {
    stopActiveTimer();
    setWakeLockWanted(false);
    const response = await fetch(`data/workouts/${filename}`);
    currentWorkout = await response.json();
    currentFilename = filename;

    // Load settings for rest time
    const settings = loadSettings();
    const restSeconds = settings.restDuration ?? 10;

    // Calculate total time
    const workTime = currentWorkout.exercises.reduce((sum, ex) => 
      sum + (ex.durationSeconds || currentWorkout.defaultWorkSeconds), 0);
    const restCount = currentWorkout.exercises.length; // rest after each + final rest
    const totalSeconds = workTime + (restCount * restSeconds);
    const totalMins = Math.floor(totalSeconds / 60);
    const totalSecs = totalSeconds % 60;
    const totalTimeStr = `${totalMins}:${totalSecs.toString().padStart(2, '0')}`;

    app.innerHTML = `
      <div class="flex flex-col h-full min-h-0">
        <!-- Header -->
        <div class="p-4 bg-primary/80 flex justify-between items-center">
          <button id="back-to-menu-btn" class="text-light underline text-lg" aria-label="Back to Menu">
            ← Back to Menu
          </button>
          <h1 class="text-xl md:text-3xl font-bold" id="workout-title"></h1>
          <button id="options-btn-preview" class="text-light underline text-lg" aria-label="Options">
            Options
          </button>
        </div>

        <!-- Carousel with Rest indicators -->
        <!-- Use px-6 / pb-6 so the scroll container edges match the gap (gap-6) between cards -->
        <div class="flex-1 min-h-0 overflow-x-auto px-6 py-6">
          <div class="flex gap-6 pb-6" style="width: max-content;" id="carousel-list"></div>
        </div>

        <!-- Total Time -->
        <div class="p-4 text-center bg-primary/60">
          <p class="text-xl opacity-90">Estimated total time (with rests)</p>
          <p class="text-2xl font-mono">${totalTimeStr}</p>
        </div>
      </div>
    `;

    // Set workout title safely
    document.getElementById('workout-title').textContent = currentWorkout.name;

    // Add event listeners for navigation
    document.getElementById('back-to-menu-btn').addEventListener('click', () => window.WorkoutApp.loadWorkoutList());
    document.getElementById('options-btn-preview').addEventListener('click', () => window.WorkoutApp.loadOptions());

    // Render carousel
    const carousel = document.getElementById('carousel-list');
    // Start button (entire card is a button for larger clickable area)
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    // Add hover/focus affordances: subtle scale and stronger shadow, and accessible focus ring
    startBtn.className = 'bg-accent rounded-2xl p-6 min-w-80 max-w-sm shadow-2xl flex items-center justify-center text-4xl font-bold text-bg text-center transition-transform transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-accent/30';
    startBtn.setAttribute('aria-label', 'Start Workout');
    const startLine1 = document.createElement('span');
    startLine1.className = 'block';
    startLine1.textContent = 'Start Workout';
    const startLine2 = document.createElement('span');
    startLine2.className = 'block text-2xl';
    startLine2.textContent = '→';
    startBtn.appendChild(startLine1);
    startBtn.appendChild(startLine2);
    startBtn.addEventListener('click', () => window.WorkoutApp.startTimer());
    carousel.appendChild(startBtn);

    // Exercises + Rest cards
    currentWorkout.exercises.forEach((ex, index) => {
      // Exercise card
      const exDiv = document.createElement('div');
      exDiv.className = 'bg-primary/50 rounded-2xl p-6 min-w-80 max-w-sm shadow-xl';
      // Image and fallback
      const imgWrap = document.createElement('div');
      imgWrap.className = 'bg-gray-800 rounded-xl h-48 flex items-center justify-center mb-4 overflow-hidden';
      const img = document.createElement('img');
      img.src = `assets/illustrations/${ex.svgFile || 'placeholder.svg'}`;
      img.alt = ex.name;
      img.className = 'w-full h-full object-contain';
      img.onerror = function() {
        this.style.display = 'none';
        fallback.style.display = 'flex';
      };
      img.setAttribute('aria-label', ex.name);
      const fallback = document.createElement('div');
      fallback.className = 'hidden flex-col items-center justify-center text-light/70';
      const fallbackNum = document.createElement('p');
      fallbackNum.className = 'text-4xl font-bold';
      fallbackNum.textContent = index + 1;
      const fallbackName = document.createElement('p');
      fallbackName.className = 'text-2xl text-center px-4 mt-2';
      fallbackName.textContent = ex.name;
      fallback.appendChild(fallbackNum);
      fallback.appendChild(fallbackName);
      imgWrap.appendChild(img);
      imgWrap.appendChild(fallback);
      exDiv.appendChild(imgWrap);
      // Title
      const h3 = document.createElement('h3');
      h3.className = 'text-2xl font-bold text-center mb-2';
      h3.textContent = `${index + 1}. ${ex.name}`;
      exDiv.appendChild(h3);
      // Duration
      const pDur = document.createElement('p');
      pDur.className = 'text-light font-mono text-center text-sm opacity-80';
      pDur.textContent = `${ex.durationSeconds || currentWorkout.defaultWorkSeconds}s`;
      exDiv.appendChild(pDur);
      // Form tips
      if (ex.formTips) {
        const pTips = document.createElement('p');
        pTips.className = 'text-light/80 text-sm mt-4 italic';
        pTips.textContent = ex.formTips;
        exDiv.appendChild(pTips);
      }
      carousel.appendChild(exDiv);
      // Rest card (skip after last exercise)
      if (index < currentWorkout.exercises.length - 1 && restSeconds > 0) {
        const restDiv = document.createElement('div');
        restDiv.className = 'flex flex-col items-center justify-center min-w-32';
        const restInner = document.createElement('div');
        restInner.className = 'bg-primary/40 rounded-2xl px-6 py-10 shadow-inner w-full max-w-xs';
        const restP = document.createElement('p');
        restP.className = 'text-2xl font-bold text-center';
        restP.textContent = 'Rest';
        const restTime = document.createElement('p');
        restTime.className = 'text-4xl font-mono mt-2 text-center';
        restTime.textContent = `${restSeconds}s`;
        restInner.appendChild(restP);
        restInner.appendChild(restTime);
        restDiv.appendChild(restInner);
        carousel.appendChild(restDiv);
      }
    });

    history.pushState({ view: 'preview', filename }, '', `#preview-${filename}`);
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workout: ${err.message}</p>`;
    console.error(err);
  }
}

function loadOptions() {
  stopActiveTimer();
  setWakeLockWanted(false);
  app.innerHTML = `
    <div class="p-4 max-w-4xl mx-auto text-center flex flex-col h-full min-h-0">
      <div class="flex justify-between items-center mb-4 flex-none">
        <button id="back-btn" class="text-light text-lg underline" aria-label="Back">Back</button>
        <h1 class="text-4xl md:text-5xl font-bold">Options</h1>
        <div class="w-20"></div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
        <!-- 1) Rest Between Exercises -->
        <div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
          <h2 class="text-2xl font-bold mb-4 text-center">Rest Between Exercises</h2>
          <div class="flex items-center justify-between mb-2">
            <label class="text-lg" for="rest-duration-slider">Rest Duration</label>
            <span id="rest-duration-value" class="text-xl font-mono bg-bg px-3 py-2 rounded-lg">10s</span>
          </div>
          <input type="range" id="rest-duration-slider" min="5" max="30" step="5" value="10"
                 class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Rest Duration">

          <div class="mt-6">
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg" for="preworkout-slider">Pre-workout Countdown</label>
              <span id="preworkout-value" class="text-xl font-mono bg-bg px-3 py-2 rounded-lg">5s</span>
            </div>
            <input type="range" id="preworkout-slider" min="3" max="10" step="1" value="5"
                   class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Pre-workout Countdown">
          </div>
        </div>

        <!-- 2) Volume Controls -->
        <div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
          <h2 class="text-2xl font-bold mb-4 text-center">Volume Controls</h2>

          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Sounds</span>
            <div class="relative">
              <input type="checkbox" id="toggle-sounds" class="sr-only peer" aria-label="Sounds" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg" for="voice-volume-slider">Guidance Voice</label>
              <span id="voice-volume-value" class="text-xl font-mono bg-bg px-3 py-2 rounded-lg">100%</span>
            </div>
            <input type="range" id="voice-volume-slider" min="0" max="100" step="5" value="100"
                   class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Guidance Voice">
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg" for="beep-volume-slider">Countdown Beeps</label>
              <span id="beep-volume-value" class="text-xl font-mono bg-bg px-3 py-2 rounded-lg">100%</span>
            </div>
            <input type="range" id="beep-volume-slider" min="0" max="100" step="5" value="100"
                   class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Countdown Beeps">
          </div>
        </div>

        <!-- 3) Theme -->
        <div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
          <h2 class="text-2xl font-bold mb-4 text-center">Theme</h2>
          <div class="flex items-center justify-between mb-4">
            <label class="text-lg" for="theme-selector">Theme</label>
            <select id="theme-selector" class="bg-bg text-light rounded-md px-3 py-2" aria-label="Theme">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-lg" for="light-color-select">Light Theme</label>
            <select id="light-color-select" class="bg-bg text-light rounded-md px-3 py-2" aria-label="Light Theme">
              <option value="#16A34A">Green</option>
              <option value="#3B82F6">Blue</option>
              <option value="#F43F5E">Rose</option>
              <option value="#10B981">Emerald</option>
              <option value="#F59E0B">Amber</option>
              <option value="#6366F1">Indigo</option>
            </select>
          </div>
        </div>

        <!-- 4) Features -->
        <div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
          <h2 class="text-2xl font-bold mb-4 text-center">Features</h2>

          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Celebrations</span>
            <div class="relative">
              <input type="checkbox" id="toggle-celebrations" class="sr-only peer" aria-label="Celebrations" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Vibration on Rest/Start</span>
            <div class="relative">
              <input type="checkbox" id="toggle-vibration" class="sr-only peer" aria-label="Vibration on Rest/Start" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-lg">Screen Wake Lock</span>
            <div class="relative">
              <input type="checkbox" id="toggle-wakelock" class="sr-only peer" aria-label="Screen Wake Lock" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>
        </div>

        <!-- Debug -->
        <div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
          <h2 class="text-2xl font-bold mb-4 text-center">Debug</h2>
          <button id="test-celebrations-btn" class="w-full bg-accent text-bg font-bold rounded-2xl py-3 px-4" aria-label="Test Celebrations">Test Celebrations</button>
          <p id="test-celebrations-note" class="text-sm text-light/80 mt-3">Cycles through celebrations for 10 seconds.</p>
        </div>
      </div>
    </div>
  `;

  history.pushState({ view: 'options' }, '', '#options');

  // === Settings Persistence & Wiring ===
  let settings = loadSettings();

  // Elements
  const restSlider = document.getElementById('rest-duration-slider');
  const restValue = document.getElementById('rest-duration-value');
  const preworkoutSlider = document.getElementById('preworkout-slider');
  const preworkoutValue = document.getElementById('preworkout-value');
  const voiceSlider = document.getElementById('voice-volume-slider');
  const voiceValue = document.getElementById('voice-volume-value');
  const beepSlider = document.getElementById('beep-volume-slider');
  const beepValue = document.getElementById('beep-volume-value');
  const themeSelector = document.getElementById('theme-selector');
  const lightColorSelect = document.getElementById('light-color-select');

  // Load saved values (apply sensible defaults when missing)
  restSlider.value = settings.restDuration ?? 10;
  restValue.textContent = `${restSlider.value}s`;

  preworkoutSlider.value = settings.preWorkoutSeconds ?? 5;
  preworkoutValue.textContent = `${preworkoutSlider.value}s`;

  voiceSlider.value = settings.voiceVolume ?? 100;
  voiceValue.textContent = `${voiceSlider.value}%`;

  beepSlider.value = settings.beepVolume ?? 100;
  beepValue.textContent = `${beepSlider.value}%`;

  document.getElementById('toggle-vibration').checked = settings.vibration ?? false;
  document.getElementById('toggle-wakelock').checked = settings.wakelock ?? true;
  document.getElementById('toggle-sounds').checked = settings.sounds ?? true;
  document.getElementById('toggle-celebrations').checked = settings.celebrations ?? true;

  // Theme select defaults
  const defaultTheme = settings.theme ?? 'system';
  const defaultLightColor = settings.lightColor ?? '#16A34A';
  if (themeSelector) themeSelector.value = defaultTheme;
  if (lightColorSelect) {
    lightColorSelect.value = defaultLightColor;
    // If the value didn't match any option (browser may ignore), fall back to the first option
    if (lightColorSelect.value !== defaultLightColor) {
      lightColorSelect.selectedIndex = 0;
    }
  }

  // Apply the theme immediately for preview (ensure consistent behavior on first open)
  applyTheme(defaultTheme, defaultLightColor);

  // Live updates + save
  function saveSettings() {
    const current = {
      restDuration: parseInt(restSlider.value),
      preWorkoutSeconds: parseInt(preworkoutSlider.value),
      voiceVolume: parseInt(voiceSlider.value),
      beepVolume: parseInt(beepSlider.value),
      theme: themeSelector ? themeSelector.value : 'system',
      lightColor: lightColorSelect
        ? lightColorSelect.value
        : (getComputedStyle(document.documentElement).getPropertyValue('--default-accent').trim() || '#16A34A'),
      vibration: document.getElementById('toggle-vibration').checked,
      wakelock: document.getElementById('toggle-wakelock').checked,
      sounds: document.getElementById('toggle-sounds').checked,
      celebrations: document.getElementById('toggle-celebrations').checked
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  }

  restSlider.addEventListener('input', () => {
    restValue.textContent = `${restSlider.value}s`;
    saveSettings();
  });
  preworkoutSlider.addEventListener('input', () => {
    preworkoutValue.textContent = `${preworkoutSlider.value}s`;
    saveSettings();
  });
  voiceSlider.addEventListener('input', () => {
    voiceValue.textContent = `${voiceSlider.value}%`;
    saveSettings();
  });
  beepSlider.addEventListener('input', () => {
    beepValue.textContent = `${beepSlider.value}%`;
    saveSettings();
  });
  // Theme and light colour handlers
  if (themeSelector) {
    themeSelector.addEventListener('change', () => {
      const theme = themeSelector.value;
      const lightColor = lightColorSelect ? lightColorSelect.value : null;
      applyTheme(theme, lightColor);
      saveSettings();
    });
  }
  if (lightColorSelect) {
    lightColorSelect.addEventListener('change', () => {
      const theme = themeSelector ? themeSelector.value : 'system';
      const lightColor = lightColorSelect.value;
      applyTheme(theme, lightColor);
      saveSettings();
    });
  }
  ['celebrations', 'vibration', 'wakelock', 'sounds'].forEach(id => {
    document.getElementById(`toggle-${id}`).addEventListener('change', saveSettings);
  });

  // Back button event
  document.getElementById('back-btn').addEventListener('click', () => window.WorkoutApp.goBackFromOptions());

  // Debug: test celebrations (cycles through the celebration list)
  const testCelebrationsBtn = document.getElementById('test-celebrations-btn');
  const testCelebrationsNote = document.getElementById('test-celebrations-note');
  if (testCelebrationsBtn) {
    testCelebrationsBtn.addEventListener('click', () => {
      if (testCelebrationsNote) {
        testCelebrationsNote.textContent = 'Cycles through celebrations for 10 seconds.';
      }

      const settingsNow = loadSettings();
      if (!(settingsNow.celebrations ?? true)) {
        if (testCelebrationsNote) {
          testCelebrationsNote.textContent = 'Turn on Celebrations above to test.';
        }
        return;
      }

      if (prefersReducedMotion()) {
        if (testCelebrationsNote) {
          testCelebrationsNote.textContent = 'Disabled because Reduce Motion is enabled on this device.';
        }
        return;
      }

      // Some older browsers may not support the Web Animations API used by the effects.
      const probe = document.createElement('div');
      if (typeof probe.animate !== 'function') {
        if (testCelebrationsNote) {
          testCelebrationsNote.textContent = 'Not supported on this browser (no Web Animations API).';
        }
        return;
      }

      try {
        startNextCelebration(testCelebrationsBtn);
      } catch {
        if (testCelebrationsNote) {
          testCelebrationsNote.textContent = 'Celebrations failed to start. Check the browser console for errors.';
        }
      }
    });
  }

}

function startTimer() {
  stopActiveTimer();

  if (!currentWorkout || !Array.isArray(currentWorkout.exercises) || currentWorkout.exercises.length === 0) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">No workout loaded.</p>`;
    return;
  }

  const settings = loadSettings();
  const restSeconds = clampNumber(settings.restDuration ?? 10, 0, 60);
  const preWorkoutSeconds = clampNumber(settings.preWorkoutSeconds ?? 5, 3, 10);
  const voiceVolume = clampNumber(settings.voiceVolume ?? 100, 0, 100);
  const beepVolume = clampNumber(settings.beepVolume ?? 100, 0, 100);

  setWakeLockWanted(true);

  const totalExercises = currentWorkout.exercises.length;
  const totalWorkSeconds = currentWorkout.exercises.reduce((sum, ex) => sum + (ex.durationSeconds || currentWorkout.defaultWorkSeconds || 30), 0);
  const totalRestSeconds = restSeconds > 0 ? restSeconds * Math.max(0, totalExercises - 1) : 0;
  const estimatedTotalSeconds = preWorkoutSeconds + totalWorkSeconds + totalRestSeconds;

  app.innerHTML = `
    <div class="flex flex-col h-full min-h-0">
      <div class="p-4 bg-primary/80 flex justify-between items-center">
        <button id="back-to-preview-btn" class="text-lg text-light underline" aria-label="Back to Preview">← Back</button>
        <div class="text-sm font-medium text-light/90 bg-primary/40 px-3 py-2 rounded-xl" data-wakelock-indicator aria-live="polite">Wake Lock</div>
        <div class="text-sm text-light/90" id="tap-hint" aria-label="Tap anywhere to pause">Tap anywhere to pause</div>
      </div>

      <div id="workout-area" class="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center" aria-label="Workout area">
        <p id="phase-label" class="text-xl md:text-2xl text-light/90 mb-4">Get ready</p>
        <h1 id="exercise-name" class="text-4xl md:text-6xl font-bold mb-4">${currentWorkout.name || 'Workout'}</h1>
        <div id="time-remaining" class="text-7xl md:text-8xl font-mono font-bold mb-6">0:00</div>

        <div class="w-full max-w-xl bg-primary/30 rounded-full h-3 overflow-hidden">
          <div id="progress-bar" class="bg-accent h-3" style="width: 0%"></div>
        </div>
        <div class="mt-4 text-lg text-light/80">
          <span id="progress-text">0 / ${totalExercises}</span>
          <span class="mx-3">•</span>
          <span id="overall-eta">Est. ${formatClock(estimatedTotalSeconds)}</span>
        </div>

        <div id="next-up" class="mt-8 bg-primary/30 rounded-3xl p-5 w-fit max-w-full mx-auto text-left">
          <p class="text-xl font-bold mb-2">Up next:</p>
          <div id="next-up-lines" class="text-lg text-light/90 space-y-1 break-words"></div>
        </div>
      </div>

      <div id="pause-overlay" class="hidden fixed inset-0 bg-bg/95 text-light" aria-label="Paused overlay">
        <div class="h-full flex flex-col items-center justify-center p-8 text-center">
          <h2 class="text-5xl md:text-6xl font-bold mb-6">Paused</h2>
          <div class="text-base font-medium text-light/90 bg-primary/40 px-4 py-3 rounded-xl mb-8" data-wakelock-indicator aria-live="polite">Wake Lock</div>
          <p class="text-2xl text-light/90">Tap anywhere to resume</p>
        </div>
      </div>
    </div>
  `;

  const backBtn = document.getElementById('back-to-preview-btn');
  const pauseOverlay = document.getElementById('pause-overlay');
  const workoutArea = document.getElementById('workout-area');
  const phaseLabel = document.getElementById('phase-label');
  const exerciseName = document.getElementById('exercise-name');
  const timeRemainingEl = document.getElementById('time-remaining');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const nextUpLines = document.getElementById('next-up-lines');

  function goBack() {
    stopActiveTimer();
    setWakeLockWanted(false);
    window.WorkoutApp.loadWorkoutPreview(currentFilename || 'quick-test.json');
  }

  backBtn.addEventListener('click', goBack);

  function pauseWorkout() {
    if (!timerState || timerState.completed) return;
    if (timerState.paused) return;
    timerState.paused = true;
    timerState.pauseStartedAt = performance.now();
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    pauseOverlay.classList.remove('hidden');
    updateWakeLockIndicators();
  }

  function resumeWorkout() {
    if (!timerState || timerState.completed) return;
    if (!timerState.paused) return;
    const pauseDelta = performance.now() - (timerState.pauseStartedAt || performance.now());
    timerState.phaseEndsAt += pauseDelta;
    timerState.paused = false;
    timerState.pauseStartedAt = null;
    pauseOverlay.classList.add('hidden');
    updateWakeLockIndicators();
  }

  // Tap anywhere in the workout area to pause (header is excluded so Back won't pause)
  workoutArea.addEventListener('click', pauseWorkout);
  // Tap anywhere on the pause overlay to resume
  pauseOverlay.addEventListener('click', resumeWorkout);

  // Prevent accidental pause when pressing Back
  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  function renderNextUp() {
    if (!nextUpLines) return;
    nextUpLines.innerHTML = '';

    const addLine = (text) => {
      const p = document.createElement('p');
      p.textContent = text;
      nextUpLines.appendChild(p);
    };

    const getExerciseSeconds = (index) => {
      const ex = currentWorkout.exercises[index];
      return ex?.durationSeconds || currentWorkout.defaultWorkSeconds || 30;
    };

    if (!timerState || timerState.completed) return;

    // Prepare: first exercise is next
    if (timerState.phase === 'prepare') {
      const firstEx = currentWorkout.exercises[0];
      addLine(`${firstEx?.name || 'Exercise 1'} ${getExerciseSeconds(0)}s`);
      return;
    }

    // Work: show rest (if any), then next exercise (if any)
    if (timerState.phase === 'work') {
      const isLast = timerState.exerciseIndex >= totalExercises - 1;
      if (restSeconds > 0) {
        addLine(`Rest ${restSeconds}s`);
      }
      if (!isLast) {
        const nextIndex = timerState.exerciseIndex + 1;
        const nextEx = currentWorkout.exercises[nextIndex];
        addLine(`${nextEx?.name || `Exercise ${nextIndex + 1}`} ${getExerciseSeconds(nextIndex)}s`);
      }
      return;
    }

    // Rest: next is the upcoming exercise
    if (timerState.phase === 'rest') {
      const nextIndex = timerState.exerciseIndex;
      const nextEx = currentWorkout.exercises[nextIndex];
      addLine(`${nextEx?.name || `Exercise ${nextIndex + 1}`} ${getExerciseSeconds(nextIndex)}s`);
    }
  }

  function setPhase(nextPhase, nextExerciseIndex, durationSeconds) {
    timerState.phase = nextPhase;
    timerState.exerciseIndex = nextExerciseIndex;
    timerState.phaseDuration = durationSeconds;
    timerState.phaseEndsAt = performance.now() + durationSeconds * 1000;
    timerState.lastSecondSpoken = null;

    if (nextPhase === 'prepare') {
      phaseLabel.textContent = 'Get ready';
      exerciseName.textContent = currentWorkout.name || 'Workout';
      progressText.textContent = `0 / ${totalExercises}`;
    } else if (nextPhase === 'work') {
      const ex = currentWorkout.exercises[nextExerciseIndex];
      phaseLabel.textContent = 'Work';
      exerciseName.textContent = ex?.name || `Exercise ${nextExerciseIndex + 1}`;
      progressText.textContent = `${nextExerciseIndex + 1} / ${totalExercises}`;

      if (shouldPlaySounds(settings)) {
        speak(exerciseName.textContent, voiceVolume);
        playBeep(beepVolume, 1320, 120);
      }
      vibrateIfEnabled(settings, [40, 30, 40]);
    } else if (nextPhase === 'rest') {
      phaseLabel.textContent = 'Rest';
      exerciseName.textContent = 'Rest';
      progressText.textContent = `${nextExerciseIndex} / ${totalExercises}`;

      if (shouldPlaySounds(settings)) {
        playBeep(beepVolume, 660, 140);
      }
      vibrateIfEnabled(settings, [80]);
    }

    updateWakeLockIndicators();
    renderNextUp();
  }

  function completeWorkout() {
    stopActiveTimer();
    setWakeLockWanted(false);
    const completionSettings = loadSettings();
    app.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center">
        <h1 id="completion-title" class="text-5xl md:text-7xl font-bold mb-6">Workout Complete!</h1>
        <p class="text-2xl text-light/80 mb-10">Nice work.</p>
        <button id="back-to-menu-btn" class="text-2xl text-light underline" aria-label="Back to Menu">Back to Menu</button>
      </div>
    `;

    if ((completionSettings.celebrations ?? true) && !prefersReducedMotion()) {
      const titleEl = document.getElementById('completion-title');
      startNextCelebration(titleEl);
    }
    document.getElementById('back-to-menu-btn').addEventListener('click', () => window.WorkoutApp.loadWorkoutList());
  }

  timerState = {
    phase: 'prepare',
    exerciseIndex: 0,
    phaseEndsAt: 0,
    phaseDuration: preWorkoutSeconds,
    paused: false,
    pauseStartedAt: null,
    completed: false,
    lastSecondSpoken: null
  };

  setPhase('prepare', 0, preWorkoutSeconds);

  // Initial render
  updateWakeLockIndicators();
  requestWakeLockIfNeeded();

  timerTickId = setInterval(() => {
    if (!timerState || timerState.completed) return;
    if (timerState.paused) return;

    const now = performance.now();
    const remainingMs = timerState.phaseEndsAt - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    timeRemainingEl.textContent = formatClock(remainingSeconds);

    // Update progress bar (rough overall progress)
    const phaseProgress = timerState.phaseDuration > 0
      ? 1 - Math.max(0, remainingMs) / (timerState.phaseDuration * 1000)
      : 1;
    const completedWorkExercises = timerState.phase === 'work'
      ? timerState.exerciseIndex
      : (timerState.phase === 'rest' ? timerState.exerciseIndex : 0);
    const overallProgress = (completedWorkExercises + (timerState.phase === 'work' ? phaseProgress : 0)) / totalExercises;
    progressBar.style.width = `${Math.round(clampNumber(overallProgress, 0, 1) * 100)}%`;

    // Beeps in last 3 seconds (for prepare/work/rest)
    if (remainingSeconds <= 3 && remainingSeconds >= 1) {
      if (timerState.lastSecondSpoken !== remainingSeconds) {
        timerState.lastSecondSpoken = remainingSeconds;
        if (settings.sounds ?? true) {
          playBeep(beepVolume, 880, 80);
        }
      }
    }

    if (remainingMs <= 0) {
      if (timerState.phase === 'prepare') {
        const firstExSeconds = currentWorkout.exercises[0].durationSeconds || currentWorkout.defaultWorkSeconds || 30;
        setPhase('work', 0, firstExSeconds);
      } else if (timerState.phase === 'work') {
        const isLast = timerState.exerciseIndex >= totalExercises - 1;
        if (isLast) {
          timerState.completed = true;
          completeWorkout();
        } else if (restSeconds > 0) {
          setPhase('rest', timerState.exerciseIndex + 1, restSeconds);
        } else {
          const nextIndex = timerState.exerciseIndex + 1;
          const nextSeconds = currentWorkout.exercises[nextIndex].durationSeconds || currentWorkout.defaultWorkSeconds || 30;
          setPhase('work', nextIndex, nextSeconds);
        }
      } else if (timerState.phase === 'rest') {
        const nextIndex = timerState.exerciseIndex;
        const nextSeconds = currentWorkout.exercises[nextIndex].durationSeconds || currentWorkout.defaultWorkSeconds || 30;
        setPhase('work', nextIndex, nextSeconds);
      }
    }
  }, 200);

  history.pushState({ view: 'timer', filename: currentFilename }, '', '#timer');
}

// Helper functions
function goBackFromOptions() {
  if (currentWorkout) {
    window.WorkoutApp.loadWorkoutPreview(currentFilename || 'quick-test.json');
  } else {
    window.WorkoutApp.loadWorkoutList();
  }
}

window.addEventListener('popstate', (event) => {
  const state = event.state || { view: 'menu' };
  if (state.view === 'menu') window.WorkoutApp.loadWorkoutList();
  else if (state.view === 'preview') window.WorkoutApp.loadWorkoutPreview(state.filename);
  else if (state.view === 'timer') window.WorkoutApp.startTimer();
  else if (state.view === 'options') window.WorkoutApp.loadOptions();
});

// Namespace exports
window.WorkoutApp.loadWorkoutPreview = loadWorkoutPreview;
window.WorkoutApp.startTimer = startTimer;
window.WorkoutApp.loadOptions = loadOptions;
window.WorkoutApp.loadWorkoutList = loadWorkoutList;
window.WorkoutApp.goBackFromOptions = goBackFromOptions;

// Initial load
applyThemeFromStorage();
window.WorkoutApp.loadWorkoutList();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

let activeCelebration = null;
let celebrationIndex = 0;

// Celebration tuning (dev-friendly constants)
const CONFETTI_BURST_INTERVAL_MS = 900;

function getAnchorCenter(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function randomConfettiColor() {
  // Bright, random colors (works in light/dark themes)
  const hue = Math.floor(Math.random() * 360);
  const sat = 85;
  const light = 60;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function createCelebrationLayer() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  // Stay on top of everything, including overlays
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);
  return container;
}

function spawnConfettiBurst(container, originX, originY, pieceCount = 70) {
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 10;
    piece.style.position = 'absolute';
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${Math.max(4, size * 0.55)}px`;
    piece.style.borderRadius = '2px';
    piece.style.background = randomConfettiColor();
    piece.style.opacity = '1';
    piece.style.transform = 'translate(-50%, -50%)';
    container.appendChild(piece);

    // Floaty confetti: small pop with a wider outward spray, then slow fall with gentle sway.
    const angle = (Math.PI * 2) * Math.random();
    const velocity = 140 + Math.random() * 220;

    // Add a little left/right randomness during the initial upward motion.
    const popXBase = Math.cos(angle) * velocity;
    const launchJitterX = (Math.random() * 2 - 1) * (28 + Math.random() * 54);
    const popX = popXBase + launchJitterX;

    const popY = Math.sin(angle) * velocity - (130 + Math.random() * 200);
    const driftX = (Math.random() * 2 - 1) * (260 + Math.random() * 420);
    const fallY = 700 + Math.random() * 520;
    const sway = (Math.random() * 2 - 1) * (48 + Math.random() * 64);
    const rotate = (Math.random() * 540 - 270);
    const duration = 3600 + Math.random() * 2400;

    const anim = piece.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg)', opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${popXBase}px, ${popY}px) rotate(${rotate * 0.25}deg)`, opacity: 1, offset: 0.16 },
        { transform: `translate(-50%, -50%) translate(${popX}px, ${popY}px) rotate(${rotate * 0.35}deg)`, opacity: 1, offset: 0.28 },
        { transform: `translate(-50%, -50%) translate(${popX + sway}px, ${popY + fallY * 0.35}px) rotate(${rotate * 0.75}deg)`, opacity: 1, offset: 0.42 },
        { transform: `translate(-50%, -50%) translate(${popX - sway}px, ${popY + fallY * 0.75}px) rotate(${rotate}deg)`, opacity: 0.9, offset: 0.64 },
        { transform: `translate(-50%, -50%) translate(${popX + driftX}px, ${popY + fallY}px) rotate(${rotate * 1.15}deg)`, opacity: 0 }
      ],
      {
        duration,
        easing: 'ease-out',
        fill: 'forwards'
      }
    );

    anim.addEventListener('finish', () => {
      piece.remove();
    });
  }
}

function startConfettiCelebration(anchorEl, durationMs = 10000) {
  if (!anchorEl) return { stop() {} };
  if (prefersReducedMotion()) return { stop() {} };

  const container = createCelebrationLayer();
  let stopped = false;

  const startTime = performance.now();
  const burst = () => {
    if (stopped) return;
    const elapsed = performance.now() - startTime;
    if (elapsed > durationMs) {
      stop();
      return;
    }
    const { x, y } = getAnchorCenter(anchorEl);
    spawnConfettiBurst(container, x, y, 50 + Math.floor(Math.random() * 30));
  };

  const burstId = window.setInterval(burst, CONFETTI_BURST_INTERVAL_MS);
  burst();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(burstId);
    window.setTimeout(() => container.remove(), 1200);
  };

  return { stop };
}

function spawnFireworkExplosion(container, x, y) {
  // Flash burst (simulated "HDR" via brightness + glow)
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${x}px`;
  flash.style.top = `${y}px`;
  flash.style.width = '10px';
  flash.style.height = '10px';
  flash.style.borderRadius = '9999px';
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.background = 'white';
  flash.style.opacity = '0.9';
  flash.style.filter = 'brightness(2.2) saturate(1.8)';
  flash.style.boxShadow = '0 0 24px rgba(255,255,255,0.95), 0 0 60px rgba(255,255,255,0.55)';
  flash.style.mixBlendMode = 'screen';
  container.appendChild(flash);
  const flashAnim = flash.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
      { transform: 'translate(-50%, -50%) scale(6)', opacity: 0.0 }
    ],
    { duration: 180, easing: 'ease-out', fill: 'forwards' }
  );
  flashAnim.addEventListener('finish', () => flash.remove());

  // Trails removed per request; only flash + particle burst remain.

  const particleCount = 46 + Math.floor(Math.random() * 22);
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    const size = 2 + Math.random() * 3.5;
    p.style.position = 'absolute';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.borderRadius = '9999px';
    p.style.transform = 'translate(-50%, -50%)';
    p.style.background = randomConfettiColor();
    p.style.opacity = '1';
    p.style.filter = 'brightness(1.9) saturate(1.6)';
    p.style.boxShadow = '0 0 16px rgba(255,255,255,0.22)';
    p.style.mixBlendMode = 'screen';
    container.appendChild(p);

    const angle = (Math.PI * 2) * (i / particleCount) + (Math.random() * 0.25);
    const speed = 220 + Math.random() * 520;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const gravity = 420 + Math.random() * 520;
    const duration = 1400 + Math.random() * 900;

    const anim = p.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1)`, opacity: 0.95, offset: 0.5 },
        { transform: `translate(-50%, -50%) translate(${dx * 1.15}px, ${dy + gravity}px) scale(0.9)`, opacity: 0 }
      ],
      { duration, easing: 'cubic-bezier(0.15, 0.85, 0.2, 1)', fill: 'forwards' }
    );

    anim.addEventListener('finish', () => p.remove());
  }
}

function launchFirework(container) {
  const startX = Math.floor(window.innerWidth * (0.12 + Math.random() * 0.76));
  const startY = window.innerHeight + 24;
  const endX = startX + (Math.random() * 220 - 110);
  const endY = Math.floor(window.innerHeight * (0.08 + Math.random() * 0.26));

  // Variety: gentle arc and sometimes a small "drop" before the explosion.
  const curveX = startX + (endX - startX) * (0.35 + Math.random() * 0.35) + (Math.random() * 160 - 80);
  const curveY = startY + (endY - startY) * (0.5 + Math.random() * 0.2);
  const shouldDrop = Math.random() < 0.22;
  const dropPx = shouldDrop ? (20 + Math.random() * 90) : 0;
  const finalX = endX;
  const finalY = endY + dropPx;

  const rocket = document.createElement('div');
  rocket.style.position = 'absolute';
  rocket.style.left = `${startX}px`;
  rocket.style.top = `${startY}px`;
  // Render as a "dot" that starts stretched into a line.
  rocket.style.width = '10px';
  rocket.style.height = '10px';
  rocket.style.borderRadius = '9999px';
  rocket.style.transform = 'translate(-50%, -50%)';
  // Warm, fiery trail look instead of pure white.
  rocket.style.background = 'linear-gradient(180deg, #ffd166 0%, #ff7a18 70%)';
  rocket.style.opacity = '0.9';
  rocket.style.filter = 'brightness(1.25) saturate(1.2)';
  rocket.style.boxShadow = '0 0 12px rgba(255,193,79,0.75), 0 0 22px rgba(255,122,24,0.55)';
  rocket.style.mixBlendMode = 'screen';
  container.appendChild(rocket);

  // Leave small fiery embers along the flight path for a more persistent tail.
  let emberIntervalId = null;
  const spawnEmber = () => {
    if (!rocket.isConnected) {
      if (emberIntervalId) {
        window.clearInterval(emberIntervalId);
        emberIntervalId = null;
      }
      return;
    }
    const rect = rocket.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const ember = document.createElement('div');
    ember.style.position = 'absolute';
    ember.style.left = `${rect.left + rect.width / 2}px`;
    ember.style.top = `${rect.top + rect.height / 2}px`;
    ember.style.width = `${6 + Math.random() * 6}px`;
    ember.style.height = `${14 + Math.random() * 12}px`;
    ember.style.borderRadius = '9999px';
    ember.style.transform = 'translate(-50%, -50%)';
    ember.style.background = 'radial-gradient(circle at 30% 25%, rgba(255,214,102,0.95), rgba(255,122,24,0.75) 55%, rgba(80,18,0,0))';
    ember.style.opacity = '0.9';
    ember.style.filter = 'blur(0.6px) brightness(1.2) saturate(1.15)';
    ember.style.mixBlendMode = 'screen';
    ember.style.boxShadow = '0 0 10px rgba(255,193,79,0.8), 0 0 18px rgba(255,122,24,0.6)';
    container.appendChild(ember);

    const driftX = (Math.random() * 10) - 5;
    const fall = 26 + Math.random() * 34;
    const emberAnim = ember.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.9 },
        { transform: `translate(-50%, -50%) translate(${driftX}px, ${fall}px) scale(1.25)`, opacity: 0 }
      ],
      { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' }
    );
    emberAnim.addEventListener('finish', () => ember.remove());
  };

  const stopTrail = () => {
    if (emberIntervalId) {
      window.clearInterval(emberIntervalId);
      emberIntervalId = null;
    }
  };

  spawnEmber();
  emberIntervalId = window.setInterval(spawnEmber, 28 + Math.random() * 18);

  const duration = 700 + Math.random() * 520;
  const explodeLeadMs = 160;

  // Stop the fiery tail shortly before the explosion for a cleaner burst transition.
  const trailCutoffMs = Math.max(0, duration - explodeLeadMs - 90);
  const trailCutoffId = window.setTimeout(() => {
    stopTrail();
  }, trailCutoffMs);

  const anim = rocket.animate(
    [
      // Start: looks like a small streak
      { transform: 'translate(-50%, -50%) translate(0px, 0px) scaleX(0.22) scaleY(1.9)', opacity: 0.9 },
      // Mid: arc/curve
      { transform: `translate(-50%, -50%) translate(${curveX - startX}px, ${curveY - startY}px) scaleX(0.18) scaleY(2.0)`, opacity: 1, offset: 0.55 },
      // Near end: becomes a bright dot right before explosion
      { transform: `translate(-50%, -50%) translate(${finalX - startX}px, ${finalY - startY}px) scale(1.02)`, opacity: 0.95, offset: 0.92 },
      // Fade out quickly to avoid a noticeable "hang" before the explosion flash
      { transform: `translate(-50%, -50%) translate(${finalX - startX}px, ${finalY - startY}px) scale(0.78)`, opacity: 0.18 }
    ],
    { duration, easing: 'cubic-bezier(0.15, 0.9, 0.2, 1)', fill: 'forwards' }
  );

  // Trigger the explosion a touch before the animation ends so it doesn't linger.
  let exploded = false;
  const explodeTimerId = window.setTimeout(() => {
    if (exploded) return;
    exploded = true;
    window.clearTimeout(trailCutoffId);
    stopTrail();
    rocket.remove();
    spawnFireworkExplosion(container, finalX, finalY);
  }, Math.max(0, duration - explodeLeadMs));

  anim.addEventListener('finish', () => {
    window.clearTimeout(explodeTimerId);
    window.clearTimeout(trailCutoffId);
    if (exploded) return;
    exploded = true;
    stopTrail();
    rocket.remove();
    spawnFireworkExplosion(container, finalX, finalY);
  });
}

function startFireworksCelebration(_anchorEl, durationMs = 10000) {
  if (prefersReducedMotion()) return { stop() {} };

  const container = createCelebrationLayer();
  let stopped = false;
  const startTime = performance.now();

  const launch = () => {
    if (stopped) return;
    const elapsed = performance.now() - startTime;
    if (elapsed > durationMs) {
      stop();
      return;
    }
    launchFirework(container);
  };

  launch();
  // Start with two rockets total: one now, one shortly after.
  window.setTimeout(launch, 180);
  const launchId = window.setInterval(launch, 1600);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(launchId);
    window.setTimeout(() => container.remove(), 2200);
  };

  return { stop };
}

const CELEBRATIONS = [
  {
    id: 'confetti',
    start: (anchorEl) => startConfettiCelebration(anchorEl, 10000)
  },
  {
    id: 'fireworks',
    start: (anchorEl) => startFireworksCelebration(anchorEl, 10000)
  }
];

function stopCelebrationIfActive() {
  if (activeCelebration && typeof activeCelebration.stop === 'function') {
    activeCelebration.stop();
  }
  activeCelebration = null;
}

function startNextCelebration(anchorEl) {
  stopCelebrationIfActive();
  if (prefersReducedMotion()) return;
  const next = CELEBRATIONS[celebrationIndex % CELEBRATIONS.length];
  celebrationIndex = (celebrationIndex + 1) % CELEBRATIONS.length;
  activeCelebration = next.start(anchorEl);
}