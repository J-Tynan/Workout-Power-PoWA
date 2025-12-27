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
            Options ⚙️
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
            Options ⚙️
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
    <div class="p-8 max-w-2xl mx-auto text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-8">Options ⚙️</h1>
      <p class="text-xl text-light mb-8">Settings coming soon:</p>
      <ul class="text-left text-lg space-y-4 max-w-md mx-auto">
        <li>• Voice volume & style</li>
        <li>• Beep sounds on/off</li>
        <li>• Dark/light mode</li>
        <li>• Adjustable timers</li>
        <li>• Circuit repeats</li>
      </ul>
      <button onclick="goBackFromOptions()" 
              class="mt-12 text-2xl text-light underline">
        ← Back
      </button>
    </div>
  `;

  history.pushState({ view: 'options' }, '', '#options');
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