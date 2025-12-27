// Main app entry point

const app = document.getElementById('app');
let currentWorkout = null;  // Will hold the loaded workout data

async function loadWorkoutList() {
  try {
    const response = await fetch('data/workouts/index.json');
    const workouts = await response.json();

    app.innerHTML = `
      <div class="p-8 max-w-4xl mx-auto text-center">
        <h1 class="text-4xl md:text-6xl font-bold mb-4">Sci7 Workout</h1>
        <p class="text-light mb-12 text-xl opacity-90">Choose a workout to begin</p>
        
        <div class="grid gap-8 md:grid-cols-1 lg:grid-cols-1">
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
        <!-- Header -->
        <div class="p-6 text-center bg-primary/80">
          <h1 class="text-3xl md:text-4xl font-bold">${currentWorkout.name}</h1>
          <p class="text-light mt-2">${currentWorkout.exercises.length} exercises • ~${Math.round((currentWorkout.defaultWorkSeconds + currentWorkout.defaultRestSeconds) * currentWorkout.exercises.length / 60)} minutes</p>
          <button onclick="loadWorkoutList()" class="mt-4 text-light underline text-lg">← Back to menu</button>
        </div>

        <!-- Horizontal scrolling carousel -->
        <div class="flex-1 overflow-x-auto px-4 py-8">
          <div class="flex gap-6 pb-4" style="width: max-content;">
            ${currentWorkout.exercises.map((ex, index) => `
              <div class="bg-primary/50 rounded-2xl p-6 min-w-80 max-w-sm shadow-xl">
                <div class="bg-gray-800 rounded-xl h-64 flex items-center justify-center mb-4">
                  <p class="text-2xl text-center px-4 text-light/70">${ex.name}</p>
                  <!-- Future SVG will go here -->
                </div>
                <h3 class="text-2xl font-bold text-center mb-2">${index + 1}. ${ex.name}</h3>
                <p class="text-light text-center text-sm opacity-80">${ex.durationSeconds || currentWorkout.defaultWorkSeconds}s</p>
                ${ex.formTips ? `<p class="text-light/80 text-sm mt-4 italic">${ex.formTips}</p>` : ''}
              </div>
            `).join('')}
            
            <!-- Start button card -->
            <div class="bg-accent rounded-2xl p-6 min-w-80 max-w-sm shadow-2xl flex items-center justify-center">
              <button onclick="startTimer()" class="text-4xl font-bold text-bg">
                Start Workout →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<p class="text-red-400 p-8 text-center">Error loading workout: ${err.message}</p>`;
  }
}

function startTimer() {
  // We'll build the actual timer next!
  app.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 class="text-5xl md:text-7xl font-bold mb-8">Timer Screen Coming Soon!</h1>
      <p class="text-3xl mb-8">Get ready for jumping jacks...</p>
      <button onclick="loadWorkoutPreview('${currentWorkout.id || 'quick-test'}.json')" class="text-2xl text-light underline">← Back to preview</button>
    </div>
  `;
}

// Global functions
window.loadWorkoutPreview = loadWorkoutPreview;
window.startTimer = startTimer;

// Initial load
loadWorkoutList();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}