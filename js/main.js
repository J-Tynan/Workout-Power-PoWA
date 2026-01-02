// Main app entry point
import { startNextCelebration, prefersReducedMotion } from './celebrations.js';
import { applyTheme, applyThemeFromSettings, registerSystemThemeChangeListener, DEFAULT_LIGHT_COLOR } from './theme.js';
import { createOptions } from './options.js';
import { createTimer } from './timer.js';
import { createUi } from './ui.js';

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;

const SETTINGS_KEY = 'workoutPowerSettings';

let wakeLockSentinel = null;
let wakeLockWanted = false;
let wakeLockLastError = null;

let loadOptions;
let loadWorkoutList;
let loadWorkoutPreview;
let startTimer;
let stopActiveTimer;

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  let settings = {};
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') settings = parsed;
    } catch {
      settings = {};
    }
  }

  let changed = false;
  if (settings.userSetTheme !== true) {
    // If a theme was previously chosen but userSetTheme flag wasn't recorded (older saves), honor it.
    if (settings.theme) {
      settings.userSetTheme = true;
    } else {
      settings.theme = 'system';
      settings.userSetTheme = false;
    }
    changed = true;
  }
  if (!settings.lightColor) {
    settings.lightColor = DEFAULT_LIGHT_COLOR;
    changed = true;
  }
  if (typeof settings.userSetTheme !== 'boolean') {
    settings.userSetTheme = settings.theme && settings.theme !== 'system';
    changed = true;
  }

  if (changed) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  return settings;
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

({ startTimer, stopActiveTimer } = createTimer({
  app,
  loadSettings,
  setWakeLockWanted,
  updateWakeLockIndicators,
  requestWakeLockIfNeeded,
  startNextCelebration,
  prefersReducedMotion,
  getCurrentWorkout: () => currentWorkout,
  getCurrentFilename: () => currentFilename,
  loadWorkoutPreview: (...args) => loadWorkoutPreview?.(...args),
  loadWorkoutList: () => loadWorkoutList?.()
}));

// UI module wiring
({ loadWorkoutList, loadWorkoutPreview } = createUi({
  app,
  loadSettings,
  stopActiveTimer,
  setWakeLockWanted,
  setCurrentWorkout: (workout, filename) => {
    currentWorkout = workout;
    currentFilename = filename;
  },
  getCurrentWorkout: () => currentWorkout,
  getCurrentFilename: () => currentFilename,
  startTimer,
  loadOptions: () => loadOptions()
}));

({ loadOptions } = createOptions({
  app,
  loadSettings,
  applyTheme,
  DEFAULT_LIGHT_COLOR,
  startNextCelebration,
  prefersReducedMotion,
  loadWorkoutPreview,
  loadWorkoutList,
  getCurrentWorkout: () => currentWorkout,
  getCurrentFilename: () => currentFilename,
  stopActiveTimer,
  setWakeLockWanted,
  settingsKey: SETTINGS_KEY
}));

// Namespace for global functions
window.WorkoutApp = {};

// React to OS/browser scheme changes only when user chose Theme=System.
registerSystemThemeChangeListener(() => loadSettings());

document.addEventListener('visibilitychange', () => {
  if (!wakeLockWanted) return;
  if (document.visibilityState === 'visible') {
    requestWakeLockIfNeeded();
  } else {
    releaseWakeLock();
    updateWakeLockIndicators();
  }
});


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
applyThemeFromSettings(loadSettings());
window.WorkoutApp.loadWorkoutList();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

