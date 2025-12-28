// Main app entry point

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;  // Track filename for back navigation

// History state management
async function loadWorkoutList() {
  try {
    const response = await fetch('data/workouts/index.json');
    const workouts = await response.json();

    app.innerHTML = `
      <div class="p-8 max-w-4xl mx-auto text-center">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-4xl md:text-6xl font-bold">Workout Power PWA</h1>
          <button onclick="loadOptions()" class="text-xl text-light underline">
            Options
          </button>
        </div>
        <p class="text-light text-xl opacity-90 text-center mb-12">Choose a workout to begin</p>
        
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          ${workouts.map(w => `
            <button 
              onclick="loadWorkoutPreview('${w.filename}')"
              class="bg-primary hover:bg-accent transition-all rounded-2xl p-6 shadow-xl hover:shadow-2xl">
              <h2 class="text-2xl font-bold mb-2">${w.name}</h2>
              <p class="text-light text-base opacity-90">${w.description}</p>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    history.replaceState({ view: 'menu' }, '', '#menu');
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workouts: ${err.message}</p>`;
  }
}

async function loadWorkoutPreview(filename) {
  try {
    const response = await fetch(`data/workouts/${filename}`);
    currentWorkout = await response.json();
    currentFilename = filename;

    app.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Header with Back and Options -->
        <div class="p-6 bg-primary/80 flex justify-between items-center">
          <button onclick="loadWorkoutList()" class="text-light underline text-lg">
            ← Back to Menu
          </button>
          <h1 class="text-2xl md:text-3xl font-bold">${currentWorkout.name}</h1>
          <button onclick="loadOptions()" class="text-light underline text-lg">
            Options
          </button>
        </div>

        <!-- Horizontal scrolling carousel -->
        <div class="flex-1 overflow-x-auto px-4 py-8">
          <div class="flex gap-6 pb-4" style="width: max-content;">
            <!-- Start Workout button FIRST -->
            <div class="bg-accent rounded-2xl p-6 min-w-80 max-w-sm shadow-2xl flex items-center justify-center">
              <button onclick="startTimer()" class="text-4xl font-bold text-bg">
                Start Workout →
              </button>
            </div>

            <!-- Exercise cards -->
            ${currentWorkout.exercises.map((ex, index) => `
              <div class="bg-primary/50 rounded-2xl p-6 min-w-80 max-w-sm shadow-xl">
                <div class="bg-gray-800 rounded-xl h-64 flex items-center justify-center mb-4">
                  <p class="text-2xl text-center px-4 text-light/70">${ex.name}</p>
                </div>
                <h3 class="text-2xl font-bold text-center mb-2">${index + 1}. ${ex.name}</h3>
                <p class="text-light text-center text-sm opacity-80">
                  ${ex.durationSeconds || currentWorkout.defaultWorkSeconds}s
                </p>
                ${ex.formTips ? `<p class="text-light/80 text-sm mt-4 italic">${ex.formTips}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    history.pushState({ view: 'preview', filename }, '', `#preview-${filename}`);
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workout: ${err.message}</p>`;
  }
}

function startTimer() {
  app.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 class="text-5xl md:text-7xl font-bold mb-8">Get Ready!</h1>
      <p class="text-3xl mb-8">Full timer with voice cues coming in the next update!</p>
      <button onclick="loadWorkoutPreview('${currentFilename || 'quick-test.json'}')" 
              class="text-2xl text-light underline">
        ← Back to ${currentWorkout?.name || 'Workout'}
      </button>
    </div>
  `;

  history.pushState({ view: 'timer', filename: currentFilename }, '', '#timer');
}

function loadOptions() {
  app.innerHTML = `
    <div class="p-8 max-w-3xl mx-auto text-center h-full flex flex-col">
      <div class="flex justify-between items-center mb-10">
        <button onclick="goBackFromOptions()" class="text-light text-lg underline">
          ← Back
        </button>
        <h1 class="text-4xl md:text-5xl font-bold">Options ⚙️</h1>
        <div class="w-20"></div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-10 pb-8">
        <!-- Voice Volume Sliders -->
        <div class="bg-primary/30 rounded-3xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold mb-6">Voice Volume</h2>
          
          <div class="mb-8">
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg">Guidance Voice</label>
              <span id="voice-volume-value" class="text-xl font-mono bg-bg px-4 py-2 rounded-lg">80%</span>
            </div>
            <input type="range" id="voice-volume-slider" min="0" max="100" value="80" 
                   class="w-full h-4 bg-gray-700 rounded-full appearance-none cursor-pointer slider">
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-lg">Countdown Beeps</label>
              <span id="beep-volume-value" class="text-xl font-mono bg-bg px-4 py-2 rounded-lg">60%</span>
            </div>
            <input type="range" id="beep-volume-slider" min="0" max="100" value="60" 
                   class="w-full h-4 bg-gray-700 rounded-full appearance-none cursor-pointer slider">
          </div>
        </div>

        <!-- Toggles -->
        <div class="bg-primary/30 rounded-3xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold mb-6">Features</h2>
          
          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Vibration on Rest/Start</span>
            <div class="relative">
              <input type="checkbox" id="toggle-vibration" checked class="sr-only peer" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between mb-6 cursor-pointer">
            <span class="text-lg">Screen Wake Lock</span>
            <div class="relative">
              <input type="checkbox" id="toggle-wakelock" checked class="sr-only peer" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-lg">Sound Effects</span>
            <div class="relative">
              <input type="checkbox" id="toggle-sounds" class="sr-only peer" />
              <div class="w-14 h-8 bg-gray-600 peer-checked:bg-accent rounded-full shadow-inner transition"></div>
              <div class="dot absolute w-6 h-6 bg-bg rounded-full shadow top-1 left-1 peer-checked:translate-x-6 transition"></div>
            </div>
          </label>
        </div>

        <!-- Theme & Voice Style (static for now, but styled) -->
        <div class="bg-primary/30 rounded-3xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold mb-6">Theme</h2>
          <label class="flex items-center mb-5"><input type="radio" name="theme" checked class="mr-4 w-6 h-6 text-accent"><span class="text-lg">Dark (Default)</span></label>
          <label class="flex items-center mb-5"><input type="radio" name="theme" class="mr-4 w-6 h-6 text-accent"><span class="text-lg">Light</span></label>
          <label class="flex items-center"><input type="radio" name="theme" class="mr-4 w-6 h-6 text-accent"><span class="text-lg">High Contrast</span></label>
        </div>

        <div class="bg-primary/30 rounded-3xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold mb-6">Voice Style</h2>
          <label class="flex items-center mb-5"><input type="radio" name="voice" checked class="mr-4 w-6 h-6 text-accent"><span class="text-lg">Natural (Default)</span></label>
          <label class="flex items-center mb-5"><input type="radio" name="voice" class="mr-4 w-6 h-6 text-accent"><span class="text-lg">Motivational Coach</span></label>
          <label class="flex items-center"><input type="radio" name="voice" class="mr-4 w-6 h-6 text-accent"><span class="text-lg">Calm & Gentle</span></label>
        </div>
      </div>
    </div>
  `;

  history.pushState({ view: 'options' }, '', '#options');

  // === Interactive Wiring ===
  
  // === Persistence with localStorage ===

  const SETTINGS_KEY = 'workoutPowerSettings';

  // Load saved settings on page load
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    const settings = JSON.parse(saved);

    if (settings.voiceVolume !== undefined) {
      voiceSlider.value = settings.voiceVolume;
      voiceValue.textContent = `${settings.voiceVolume}%`;
    }
    if (settings.beepVolume !== undefined) {
      beepSlider.value = settings.beepVolume;
      beepValue.textContent = `${settings.beepVolume}%`;
    }
    if (settings.vibration !== undefined) {
      document.getElementById('toggle-vibration').checked = settings.vibration;
    }
    if (settings.wakelock !== undefined) {
      document.getElementById('toggle-wakelock').checked = settings.wakelock;
    }
    if (settings.sounds !== undefined) {
      document.getElementById('toggle-sounds').checked = settings.sounds;
    }
  }

  // Save settings whenever anything changes
  function saveSettings() {
    const settings = {
      voiceVolume: parseInt(voiceSlider.value),
      beepVolume: parseInt(beepSlider.value),
      vibration: document.getElementById('toggle-vibration').checked,
      wakelock: document.getElementById('toggle-wakelock').checked,
      sounds: document.getElementById('toggle-sounds').checked,
      // Add more later: theme, voiceStyle, etc.
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // Attach save on change
  voiceSlider.addEventListener('input', () => {
    voiceValue.textContent = `${voiceSlider.value}%`;
    saveSettings();
  });

  beepSlider.addEventListener('input', () => {
    beepValue.textContent = `${beepSlider.value}%`;
    saveSettings();
  });

  document.getElementById('toggle-vibration').addEventListener('change', saveSettings);
  document.getElementById('toggle-wakelock').addEventListener('change', saveSettings);
  document.getElementById('toggle-sounds').addEventListener('change', saveSettings);

  // Volume sliders - update percentage display live
  const voiceSlider = document.getElementById('voice-volume-slider');
  const voiceValue = document.getElementById('voice-volume-value');
  voiceSlider.addEventListener('input', () => {
    voiceValue.textContent = `${voiceSlider.value}%`;
  });

  const beepSlider = document.getElementById('beep-volume-slider');
  const beepValue = document.getElementById('beep-volume-value');
  beepSlider.addEventListener('input', () => {
    beepValue.textContent = `${beepSlider.value}%`;
  });

  // Toggles - clicking the label toggles the checkbox (peer class handles visual)
  // No extra JS needed beyond Tailwind's peer-checked classes!
}

// Helper to go back correctly from Options (returns to previous screen)
function goBackFromOptions() {
  if (currentWorkout) {
    loadWorkoutPreview(currentFilename || 'quick-test.json');
  } else {
    loadWorkoutList();
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
  const state = event.state;

  if (!state || state.view === 'menu') {
    loadWorkoutList();
  } else if (state.view === 'preview') {
    loadWorkoutPreview(state.filename);
  } else if (state.view === 'timer') {
    startTimer();
  } else if (state.view === 'options') {
    loadOptions();
  }
});

// Global functions for onclick
window.loadWorkoutPreview = loadWorkoutPreview;
window.startTimer = startTimer;
window.loadOptions = loadOptions;
window.loadWorkoutList = loadWorkoutList;
window.goBackFromOptions = goBackFromOptions;

// Initial load
loadWorkoutList();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}