// Main app entry point

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;

// Namespace for global functions
window.WorkoutApp = {};

// History state management
async function loadWorkoutList() {
  try {
    const response = await fetch('data/workouts/index.json');
    const workouts = await response.json();

    app.innerHTML = `
      <div class="p-6 max-w-4xl mx-auto text-center">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-4xl md:text-6xl font-bold">Workout Power PWA</h1>
          <button id="options-btn" class="text-xl text-light underline" aria-label="Options">
            Options
          </button>
        </div>
        <p class="text-light text-xl opacity-90 text-center mb-12">Choose a workout to begin</p>
        
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3" id="workout-list-grid"></div>
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
    const response = await fetch(`data/workouts/${filename}`);
    currentWorkout = await response.json();
    currentFilename = filename;

    // Load settings for rest time
    const saved = localStorage.getItem('workoutPowerSettings');
    const settings = saved ? JSON.parse(saved) : {};
    const restSeconds = settings.restDuration || 10;

    // Calculate total time
    const workTime = currentWorkout.exercises.reduce((sum, ex) => 
      sum + (ex.durationSeconds || currentWorkout.defaultWorkSeconds), 0);
    const restCount = currentWorkout.exercises.length; // rest after each + final rest
    const totalSeconds = workTime + (restCount * restSeconds);
    const totalMins = Math.floor(totalSeconds / 60);
    const totalSecs = totalSeconds % 60;
    const totalTimeStr = `${totalMins}:${totalSecs.toString().padStart(2, '0')}`;

    app.innerHTML = `
      <div class="flex flex-col h-full">
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
        <div class="flex-1 overflow-x-auto px-6 py-6">
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
  app.innerHTML = `
    <div class="p-4 max-w-4xl mx-auto text-center h-full flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <button id="back-btn" class="text-light text-lg underline" aria-label="Back">
        Back
        </button>
        <h1 class="text-4xl md:text-5xl font-bold">Options</h1>
        <div class="w-20"></div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-10 pb-2">
        <!-- Rest Duration -->
        <div class="bg-primary/30 rounded-3xl p-4 shadow-xl">
          <h2 class="text-2xl font-bold mb-4">Rest Between Exercises</h2>
          <div class="flex items-center justify-between mb-2">
            <label class="text-lg" for="rest-duration-slider">Rest Duration</label>
            <span id="rest-duration-value" class="text-xl font-mono bg-bg px-2 py-2 rounded-lg">10s</span>
          </div>
          <input type="range" id="rest-duration-slider" min="5" max="30" step="5" value="10" 
                 class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Rest Duration">
        </div>

        <!-- Volume Sliders -->
        <div class="bg-primary/30 rounded-3xl p-4 shadow-xl">
          <h2 class="text-2xl font-bold mb-2">Volume Controls</h2>
          
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg" for="voice-volume-slider">Guidance Voice</label>
              <span id="voice-volume-value" class="text-xl font-mono bg-bg px-2 py-2 rounded-lg">100%</span>
            </div>
            <input type="range" id="voice-volume-slider" min="0" max="100" value="100" 
                   class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Guidance Voice Volume">
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg" for="beep-volume-slider">Countdown Beeps</label>
              <span id="beep-volume-value" class="text-xl font-mono bg-bg px-2 py-2 rounded-lg">100%</span>
            </div>
            <input type="range" id="beep-volume-slider" min="0" max="100" value="100" 
                   class="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider" aria-label="Countdown Beep Volume">
          </div>
        </div>

        <!-- Theme Selector -->
        <div class="bg-primary/30 rounded-3xl p-4 shadow-xl">
          <h2 class="text-2xl font-bold mb-4">Theme</h2>
          <div class="flex items-center justify-between mb-4">
            <label class="text-lg" for="theme-selector">App Theme</label>
            <select id="theme-selector" class="bg-bg text-light rounded-md px-3 py-2" aria-label="Theme selector">
              <option value="system">System (Default)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div class="flex items-center justify-between">
            <label class="text-lg" for="light-color-select">Light Theme Colour</label>
            <select id="light-color-select" class="bg-bg text-light rounded-md px-3 py-2" aria-label="Light theme colour">
              <option value="#16A34A">Green</option>
              <option value="#3B82F6">Blue</option>
              <option value="#F43F5E">Rose</option>
              <option value="#10B981">Emerald</option>
              <option value="#F59E0B">Amber</option>
              <option value="#6366F1">Indigo</option>
              <option value="#14B8A6">Teal</option>
            </select>
          </div>
        </div>

        <!-- Feature Toggles -->
        <div class="bg-primary/30 rounded-3xl p-4 shadow-xl">
          <h2 class="text-2xl font-bold mb-4">Features</h2>
          
          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Vibration on Rest/Start</span>
            <div class="relative">
              <input type="checkbox" id="toggle-vibration" checked class="sr-only peer" aria-label="Vibration on Rest/Start" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Screen Wake Lock</span>
            <div class="relative">
              <input type="checkbox" id="toggle-wakelock" checked class="sr-only peer" aria-label="Screen Wake Lock" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-lg">Sound Effects</span>
            <div class="relative">
              <input type="checkbox" id="toggle-sounds" class="sr-only peer" aria-label="Sound Effects" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  `;

  history.pushState({ view: 'options' }, '', '#options');

  // Light palette map for selectable accents (must be defined before applyTheme runs)
  const LIGHT_THEME_PALETTES = {
    '#16a34a': { accent: '#16a34a', bg: '#f0fdf4', primary: '#dcfce7', light: '#0f172a' }, // Green
    '#3b82f6': { accent: '#2563eb', bg: '#eff6ff', primary: '#dbeafe', light: '#1e3a8a' }, // Blue
    '#f43f5e': { accent: '#f43f5e', bg: '#fff1f2', primary: '#ffe4ec', light: '#581c2e' }, // Rose
    '#10b981': { accent: '#059669', bg: '#ecfdf5', primary: '#d1fae5', light: '#064e3b' }, // Emerald
    '#f59e0b': { accent: '#d97706', bg: '#fff7ed', primary: '#ffedd5', light: '#78350f' }, // Amber
    '#6366f1': { accent: '#4c1d95', bg: '#eef2ff', primary: '#e0e7ff', light: '#312e81' }, // Indigo
    '#14b8a6': { accent: '#0d9488', bg: '#ecfeff', primary: '#ccfbf1', light: '#0f766e' }  // Teal
  };
  const DEFAULT_DARK_PALETTE = { accent: '#16a34a', bg: '#07140d', primary: '#0f3d1a', light: '#c7f9d0' };
  const DEFAULT_LIGHT_PALETTE = LIGHT_THEME_PALETTES['#16a34a'];

  // === Settings Persistence & Wiring ===
  const SETTINGS_KEY = 'workoutPowerSettings';
  const saved = localStorage.getItem(SETTINGS_KEY);
  let settings = saved ? JSON.parse(saved) : {};

  // Elements
  const restSlider = document.getElementById('rest-duration-slider');
  const restValue = document.getElementById('rest-duration-value');
  const voiceSlider = document.getElementById('voice-volume-slider');
  const voiceValue = document.getElementById('voice-volume-value');
  const beepSlider = document.getElementById('beep-volume-slider');
  const beepValue = document.getElementById('beep-volume-value');
  const themeSelector = document.getElementById('theme-selector');
  const lightColorSelect = document.getElementById('light-color-select');

  // Load saved values (apply sensible defaults when missing)
  restSlider.value = settings.restDuration ?? 10;
  restValue.textContent = `${restSlider.value}s`;

  voiceSlider.value = settings.voiceVolume ?? 100;
  voiceValue.textContent = `${voiceSlider.value}%`;

  beepSlider.value = settings.beepVolume ?? 100;
  beepValue.textContent = `${beepSlider.value}%`;

  document.getElementById('toggle-vibration').checked = settings.vibration ?? true;
  document.getElementById('toggle-wakelock').checked = settings.wakelock ?? true;
  document.getElementById('toggle-sounds').checked = settings.sounds ?? false;

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
      voiceVolume: parseInt(voiceSlider.value),
      beepVolume: parseInt(beepSlider.value),
      theme: themeSelector ? themeSelector.value : 'system',
      lightColor: lightColorSelect ? lightColorSelect.value : getComputedStyle(document.documentElement).getPropertyValue('--default-accent').trim(),
      vibration: document.getElementById('toggle-vibration').checked,
      wakelock: document.getElementById('toggle-wakelock').checked,
      sounds: document.getElementById('toggle-sounds').checked
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  }

  restSlider.addEventListener('input', () => {
    restValue.textContent = `${restSlider.value}s`;
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
  ['vibration', 'wakelock', 'sounds'].forEach(id => {
    document.getElementById(`toggle-${id}`).addEventListener('change', saveSettings);
  });

  // Back button event
  document.getElementById('back-btn').addEventListener('click', () => window.WorkoutApp.goBackFromOptions());

  function applyPalette(palette) {
    const root = document.documentElement;
    if (!palette) return;
    root.style.setProperty('--color-bg', palette.bg);
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-light', palette.light);
    root.style.setProperty('--color-accent', palette.accent);
  }

  function getLightPalette(color) {
    if (!color) return DEFAULT_LIGHT_PALETTE;
    const normalized = color.trim().toLowerCase();
    return LIGHT_THEME_PALETTES[normalized] || DEFAULT_LIGHT_PALETTE;
  }

  // ApplyTheme function: sets data-theme and swaps accent variable for light theme
  function applyTheme(theme, lightColor) {
    const root = document.documentElement;
    if (!theme || theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
        applyPalette(DEFAULT_DARK_PALETTE);
      } else {
        root.setAttribute('data-theme', 'light');
        applyPalette(getLightPalette(lightColor));
      }
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      applyPalette(DEFAULT_DARK_PALETTE);
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      applyPalette(getLightPalette(lightColor));
    }
  }
}

// Placeholder timer (we'll replace this tomorrow)
function startTimer() {
  app.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 class="text-5xl md:text-7xl font-bold mb-8">Timer Coming Tomorrow!</h1>
      <p class="text-3xl mb-8">Full countdown, voice cues, and rest timing</p>
      <button id="back-to-preview-btn" class="text-2xl text-light underline" aria-label="Back to Preview">
        ← Back
      </button>
    </div>
  `;
  document.getElementById('back-to-preview-btn').addEventListener('click', () => window.WorkoutApp.loadWorkoutPreview(currentFilename || 'quick-test.json'));
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
window.WorkoutApp.loadWorkoutList();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.error('Service worker registration failed:', err);
  });
}