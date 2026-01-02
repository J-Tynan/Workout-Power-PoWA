// UI rendering helpers extracted from main.js

function createUi({
  app,
  loadSettings,
  stopActiveTimer,
  setWakeLockWanted,
  setCurrentWorkout,
  getCurrentWorkout,
  getCurrentFilename,
  startTimer,
  loadOptions
}) {
  async function loadWorkoutList() {
    try {
      stopActiveTimer();
      setWakeLockWanted(false);
      // Ensure the main views keep scrollbars at the window edge
      document.body.style.overflow = '';
      app.style.overflow = 'hidden';
      app.style.height = '100dvh';
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

      document.getElementById('options-btn').addEventListener('click', () => loadOptions());

      const grid = document.getElementById('workout-list-grid');
      workouts.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'bg-primary hover:bg-accent transition-all rounded-2xl p-6 shadow-xl hover:shadow-2xl';
        btn.setAttribute('aria-label', `Preview workout: ${w.name}`);
        btn.addEventListener('click', () => loadWorkoutPreview(w.filename));
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
      // Ensure the main views keep scrollbars at the window edge
      document.body.style.overflow = '';
      app.style.overflow = 'hidden';
      app.style.height = '100dvh';
      const response = await fetch(`data/workouts/${filename}`);
      const workout = await response.json();
      setCurrentWorkout(workout, filename);

      const settings = loadSettings();
      const restSeconds = settings.restDuration ?? 10;

      const workTime = workout.exercises.reduce((sum, ex) => sum + (ex.durationSeconds || workout.defaultWorkSeconds), 0);
      const restCount = workout.exercises.length;
      const totalSeconds = workTime + (restCount * restSeconds);
      const totalMins = Math.floor(totalSeconds / 60);
      const totalSecs = totalSeconds % 60;
      const totalTimeStr = `${totalMins}:${totalSecs.toString().padStart(2, '0')}`;

      app.innerHTML = `
        <div class="flex flex-col h-full min-h-0">
          <!-- Header bar: reduce p-3 for mobile, raise to p-4+ for larger screens if desired. -->
          <div class="p-3 md:p-4 bg-primary/80 flex justify-between items-center">
            <button id="back-to-menu-btn" class="text-light underline text-lg" aria-label="Back to Menu">
              Menu
            </button>
            <h1 class="text-xl md:text-3xl font-bold" id="workout-title"></h1>
            <button id="options-btn-preview" class="text-light underline text-lg" aria-label="Options">
              Options
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-x-auto px-6 py-6">
            <div class="flex gap-6 pb-6" style="width: max-content;" id="carousel-list"></div>
          </div>

          <div class="p-4 text-center bg-primary/60">
            <p class="text-xl opacity-90">Estimated total time (with rests)</p>
            <p class="text-2xl font-mono">${totalTimeStr}</p>
          </div>
        </div>
      `;

      document.getElementById('workout-title').textContent = workout.name;
      document.getElementById('back-to-menu-btn').addEventListener('click', () => loadWorkoutList());
      document.getElementById('options-btn-preview').addEventListener('click', () => loadOptions());

      const carousel = document.getElementById('carousel-list');
      const startBtn = document.createElement('button');
      startBtn.type = 'button';
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
      startBtn.addEventListener('click', () => startTimer());
      carousel.appendChild(startBtn);

      workout.exercises.forEach((ex, index) => {
        const exDiv = document.createElement('div');
        exDiv.className = 'bg-primary/50 rounded-2xl p-6 min-w-80 max-w-sm shadow-xl';
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
        fallback.className = 'hidden w-full h-full flex-col items-center justify-center text-light/90 bg-primary/70';
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
        const h3 = document.createElement('h3');
        h3.className = 'text-2xl font-bold text-center mb-2';
        h3.textContent = `${index + 1}. ${ex.name}`;
        exDiv.appendChild(h3);
        const pDur = document.createElement('p');
        pDur.className = 'text-light font-mono text-center text-sm opacity-80';
        pDur.textContent = `${ex.durationSeconds || workout.defaultWorkSeconds}s`;
        exDiv.appendChild(pDur);
        if (ex.formTips) {
          const pTips = document.createElement('p');
          pTips.className = 'text-light/80 text-sm mt-4 italic';
          pTips.textContent = ex.formTips;
          exDiv.appendChild(pTips);
        }
        carousel.appendChild(exDiv);
        if (index < workout.exercises.length - 1 && restSeconds > 0) {
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

  return {
    loadWorkoutList,
    loadWorkoutPreview
  };
}

export { createUi };

