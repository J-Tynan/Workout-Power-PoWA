const app = document.getElementById('app');
let currentWorkout = null;

async function loadWorkoutList() {
  try {
    const response = await fetch('data/workouts/index.json');
    const workouts = await response.json();

    app.innerHTML = `
      <div class="p-8 max-w-4xl mx-auto text-center">
        <h1 class="text-4xl md:text-6xl font-bold mb-4">Workout Power PWA</h1>
        <p class="text-light mb-12 text-xl opacity-90">Choose a workout to begin</p>
        
        <div class="grid gap-8">
          ${workouts.map(w => `
            <button 
              onclick="loadWorkoutPreview('${w.filename}')"
              class="bg-primary hover:bg-accent transition-all rounded-3xl p-10 shadow-2xl transform hover:scale-105">
              <h2 class="text-3xl font-bold mb-3">${w.name}</h2>
              <p class="text-light text-lg opacity-90">${w.description}</p>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workouts: ${err.message}</p>`;
  }
}

async function loadWorkoutPreview(filename) {
  try {
    const response = await fetch(`data/workouts/${filename}`);
    currentWorkout = await response.json();

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
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workout: ${err.message}</p>`;
  }
}

function startTimer() {
  app.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 class="text-5xl md:text-7xl font-bold mb-8">Get Ready!</h1>
      <p class="text-3xl mb-8">Full timer with voice cues coming in the next update!</p>
      <button onclick="loadWorkoutPreview('${currentWorkout?.id || 'quick-test'}.json')" 
              class="text-2xl text-light underline">
        ← Back to ${currentWorkout?.name || 'Workout'}
      </button>
    </div>
  `;
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
      <button onclick="loadWorkoutPreview('${currentWorkout?.id || 'quick-test'}.json')" 
              class="mt-12 text-2xl text-light underline">
        ← Back to Workout
      </button>
    </div>
  `;
}

// Global functions
window.loadWorkoutPreview = loadWorkoutPreview;
window.startTimer = startTimer;
window.loadOptions = loadOptions;
window.loadWorkoutList = loadWorkoutList;

// Initial load
loadWorkoutList();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}