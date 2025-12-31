// Main app entry point
import { startNextCelebration, prefersReducedMotion } from './celebrations.js';
import { applyTheme, applyThemeFromSettings, registerSystemThemeChangeListener, DEFAULT_LIGHT_COLOR } from './theme.js';
import { createOptions } from './options.js';
import { createUi } from './ui.js';

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;

const SETTINGS_KEY = 'workoutPowerSettings';

let wakeLockSentinel = null;
let wakeLockWanted = false;
let wakeLockLastError = null;

let timerTickId = null;
let timerState = null;

let loadOptions;

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

// UI module wiring
const { loadWorkoutList, loadWorkoutPreview } = createUi({
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
});

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
applyThemeFromSettings(loadSettings());
window.WorkoutApp.loadWorkoutList();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

