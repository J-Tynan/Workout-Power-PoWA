// Main app entry point

const app = document.getElementById('app');
let currentWorkout = null;
let currentFilename = null;

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
        <div class="p-6 bg-primary/80 flex justify-between items-center">
          <button onclick="loadWorkoutList()" class="text-light underline text-lg">
            ← Back to Menu
          </button>
          <h1 class="text-2xl md:text-3xl font-bold">${currentWorkout.name}</h1>
          <button onclick="loadOptions()" class="text-light underline text-lg">
            Options
          </button>
        </div>

        <!-- Carousel with Rest indicators -->
        <div class="flex-1 overflow-x-auto px-4 py-8">
          <div class="flex gap-6 pb-4" style="width: max-content;">
            <!-- Start Button -->
            <div class="bg-accent rounded-2xl p-6 min-w-80 max-w-sm shadow-2xl flex items-center justify-center">
              <button onclick="startTimer()" class="text-4xl font-bold text-bg">
                Start Workout →
              </button>
            </div>

            <!-- Exercises + Rest cards -->
            ${currentWorkout.exercises.map((ex, index) => {
              let restCard = '';
              if (index < currentWorkout.exercises.length - 1 || restSeconds > 0) {
              restCard = `
              <div class="flex flex-col items-center justify-center min-w-48">
                <div class="bg-primary/40 rounded-2xl px-6 py-10 shadow-inner w-full max-w-xs">
                  <p class="text-2xl font-bold text-center">Rest</p>
                  <p class="text-4xl font-mono mt-2 text-center">${restSeconds}s</p>
                </div>
              </div>
              `;
              }
              return `
                <div class="bg-primary/50 rounded-2xl p-6 min-w-80 max-w-sm shadow-xl">
                  <div class="bg-gray-800 rounded-xl h-64 flex items-center justify-center mb-4 overflow-hidden">
                    <img src="assets/illustrations/${ex.svgFile || 'placeholder.svg'}" 
                         alt="${ex.name}"
                         class="w-full h-full object-contain"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="hidden flex-col items-center justify-center text-light/70">
                      <p class="text-4xl font-bold">${index + 1}</p>
                      <p class="text-2xl text-center px-4 mt-2">${ex.name}</p>
                    </div>
                  </div>
                  <h3 class="text-2xl font-bold text-center mb-2">${index + 1}. ${ex.name}</h3>
                  <p class="text-light font-mono text-center text-sm opacity-80">
                    ${ex.durationSeconds || currentWorkout.defaultWorkSeconds}s
                  </p>
                  ${ex.formTips ? `<p class="text-light/80 text-sm mt-4 italic">${ex.formTips}</p>` : ''}
                </div>
                ${restCard}
              `;
            }).join('')}
          </div>
        </div>

        <!-- Total Time -->
        <div class="p-6 text-center bg-primary/60">
          <p class="text-xl opacity-90">Estimated total time (with rests)</p>
          <p class="text-4xl font-mono">${totalTimeStr}</p>
        </div>
      </div>
    `;

    history.pushState({ view: 'preview', filename }, '', `#preview-${filename}`);
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workout: ${err.message}</p>`;
  }
}

function loadOptions() {
  app.innerHTML = `
    <div class="p-8 max-w-3xl mx-auto text-center h-full flex flex-col">
      <div class="flex justify-between items-center mb-10">
        <button onclick="goBackFromOptions()" class="text-light text-lg underline">
          ← Back
        </button>
        <h1 class="text-4xl md:text-5xl font-bold">Options</h1>
        <div class="w-20"></div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-10 pb-8">
        <!-- Rest Duration -->
        <div class="bg-primary/30 rounded-3xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold mb-6">Rest Between Exercises</h2>
          <div class="flex items-center justify-between mb-2">
            <label class="text-lg">Rest Duration</label>
            <span id="rest-duration-value" class="text-xl font-mono bg-bg px-4 py-2 rounded-lg">10s</span>
          </div>
          <input type="range" id="rest-duration-slider" min="5" max="30" step="5" value="10" 
                 class="w-full h-4 bg-gray-700 rounded-full appearance-none cursor-pointer slider">
        </div>

        <!-- Volume Sliders -->
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

        <!-- Feature Toggles -->
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
      </div>
    </div>
  `;

  history.pushState({ view: 'options' }, '', '#options');

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

  // Load saved values
  if (saved) {
    const loaded = JSON.parse(saved);
    restSlider.value = loaded.restDuration ?? 10;
    restValue.textContent = `${restSlider.value}s`;
    voiceSlider.value = loaded.voiceVolume ?? 80;
    voiceValue.textContent = `${voiceSlider.value}%`;
    beepSlider.value = loaded.beepVolume ?? 60;
    beepValue.textContent = `${beepSlider.value}%`;
    document.getElementById('toggle-vibration').checked = loaded.vibration ?? true;
    document.getElementById('toggle-wakelock').checked = loaded.wakelock ?? true;
    document.getElementById('toggle-sounds').checked = loaded.sounds ?? false;
  }

  // Live updates + save
  function saveSettings() {
    const current = {
      restDuration: parseInt(restSlider.value),
      voiceVolume: parseInt(voiceSlider.value),
      beepVolume: parseInt(beepSlider.value),
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
  ['vibration', 'wakelock', 'sounds'].forEach(id => {
    document.getElementById(`toggle-${id}`).addEventListener('change', saveSettings);
  });
}

// Placeholder timer (we'll replace this tomorrow)
function startTimer() {
  app.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 class="text-5xl md:text-7xl font-bold mb-8">Timer Coming Tomorrow!</h1>
      <p class="text-3xl mb-8">Full countdown, voice cues, and rest timing</p>
      <button onclick="loadWorkoutPreview('${currentFilename || 'quick-test.json'}')" 
              class="text-2xl text-light underline">
        ← Back
      </button>
    </div>
  `;
}

// Helper functions
function goBackFromOptions() {
  if (currentWorkout) {
    loadWorkoutPreview(currentFilename || 'quick-test.json');
  } else {
    loadWorkoutList();
  }
}

window.addEventListener('popstate', (event) => {
  const state = event.state || { view: 'menu' };
  if (state.view === 'menu') loadWorkoutList();
  else if (state.view === 'preview') loadWorkoutPreview(state.filename);
  else if (state.view === 'timer') startTimer();
  else if (state.view === 'options') loadOptions();
});

// Global exports
window.loadWorkoutPreview = loadWorkoutPreview;
window.startTimer = startTimer;
window.loadOptions = loadOptions;
window.loadWorkoutList = loadWorkoutList;
window.goBackFromOptions = goBackFromOptions;

// Initial load
loadWorkoutList();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}