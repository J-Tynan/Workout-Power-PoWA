// Options screen rendering extracted from main.js

function createOptions({
	app,
	loadSettings,
	applyTheme,
	DEFAULT_LIGHT_COLOR,
	startNextCelebration,
	prefersReducedMotion,
	loadWorkoutPreview,
	loadWorkoutList,
	getCurrentWorkout,
	getCurrentFilename,
	stopActiveTimer,
	setWakeLockWanted,
	settingsKey = 'workoutPowerSettings'
}) {
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

					<div class="bg-primary rounded-3xl p-4 shadow-xl text-left">
						<h2 class="text-2xl font-bold mb-4 text-center">Debug</h2>
						<button id="test-celebrations-btn" class="w-full bg-accent text-bg font-bold rounded-2xl py-3 px-4" aria-label="Test Celebrations">Test Celebrations</button>
						<p id="test-celebrations-note" class="text-sm text-light/80 mt-3">Cycles through celebrations for 10 seconds.</p>
					</div>
				</div>
			</div>
		`;

		history.pushState({ view: 'options' }, '', '#options');

		let settings = loadSettings();

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

		const defaultTheme = settings.theme ?? 'system';
		const defaultLightColor = settings.lightColor ?? DEFAULT_LIGHT_COLOR;
		if (themeSelector) themeSelector.value = defaultTheme;
		if (lightColorSelect) {
			lightColorSelect.value = defaultLightColor;
			if (lightColorSelect.value !== defaultLightColor) {
				lightColorSelect.selectedIndex = 0;
			}
		}

		applyTheme(defaultTheme, defaultLightColor);

		function saveSettings() {
			const current = {
				restDuration: parseInt(restSlider.value),
				preWorkoutSeconds: parseInt(preworkoutSlider.value),
				voiceVolume: parseInt(voiceSlider.value),
				beepVolume: parseInt(beepSlider.value),
				theme: themeSelector ? themeSelector.value : 'system',
				lightColor: lightColorSelect
					? lightColorSelect.value
					: (getComputedStyle(document.documentElement).getPropertyValue('--default-accent').trim() || DEFAULT_LIGHT_COLOR),
				vibration: document.getElementById('toggle-vibration').checked,
				wakelock: document.getElementById('toggle-wakelock').checked,
				sounds: document.getElementById('toggle-sounds').checked,
				celebrations: document.getElementById('toggle-celebrations').checked
			};
			localStorage.setItem(settingsKey, JSON.stringify(current));
			settings = current;
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

		document.getElementById('back-btn').addEventListener('click', () => {
			if (getCurrentWorkout()) {
				loadWorkoutPreview(getCurrentFilename() || 'quick-test.json');
			} else {
				loadWorkoutList();
			}
		});

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

	return {
		loadOptions
	};
}

export { createOptions };

