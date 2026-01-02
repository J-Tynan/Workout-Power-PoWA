// Lightweight celebration system: confetti + fireworks with shared canvas and emitters.
// High-level contract:
// - startNextCelebration() starts a 10s run, choosing a random celebration (confetti or fireworks).
// - If a run is active and startNextCelebration is called again, the previous run stops immediately.
// - Effects emit every 1s during the 10s window.
// - No external deps; uses a single fixed-position canvas for rendering.
// - Colors are Tailwind-compatible hexes.

const TAILWIND_COLORS = [
	'#16A34A', // green-600
	'#22C55E', // green-500
	'#3B82F6', // blue-500
	'#6366F1', // indigo-500
	'#F59E0B', // amber-500
	'#F43F5E', // rose-500
	'#EC4899', // pink-500
	'#0EA5E9'  // sky-500
];

let canvas = null;
let ctx = null;
let rafId = null;
let particles = [];
let activeRun = null;

function prefersReducedMotion() {
	return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureCanvas() {
	if (canvas) return;
	canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	canvas.style.inset = '0';
	canvas.style.pointerEvents = 'none';
	canvas.style.zIndex = '9999';
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);
	ctx = canvas.getContext('2d');
	window.addEventListener('resize', () => {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	});
}

function clearRun() {
	if (activeRun && typeof activeRun.stop === 'function') {
		activeRun.stop();
	}
	activeRun = null;
}

function startLoop() {
	if (rafId) return;
	const loop = () => {
		rafId = requestAnimationFrame(loop);
		if (!ctx || !canvas) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const now = performance.now();
		particles = particles.filter(p => {
			const alive = updateParticle(p, now);
			if (alive) drawParticle(p);
			return alive;
		});
	};
	loop();
}

function stopLoopIfIdle() {
	if (particles.length > 0) return;
	if (rafId) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ---- Particle system ----

function updateParticle(p, now) {
	const dt = Math.min((now - p.last) / 1000, 0.05);
	p.last = now;
	if (p.type === 'confetti') {
		p.vy += 600 * dt; // gravity
		p.vx += p.wind * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.spin += p.spinSpeed * dt;
		p.life -= dt;
		if (p.y > canvas.height + 50) p.life = -1;
	} else if (p.type === 'rocket') {
		p.vy += 300 * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		if (!p.explode && now - (p.lastTrail || 0) > 40) {
			spawnTrail(p.x, p.y, p.trailColor);
			p.lastTrail = now;
		}
		if (p.targetY && p.y <= p.targetY) p.explode = true;
		if (p.vy > -30) p.explode = true;
		p.life -= dt;
	} else if (p.type === 'spark') {
		p.vy += 250 * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.life -= dt;
	} else if (p.type === 'flash') {
		p.life -= dt;
		p.r += 20 * dt;
		p.alpha = Math.max(0, p.life / p.maxLife);
	}
	return p.life > 0;
}

function drawParticle(p) {
	if (!ctx) return;
	if (p.type === 'confetti') {
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(p.spin);
		ctx.fillStyle = p.color;
		ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
		ctx.restore();
	} else if (p.type === 'rocket') {
		// trail
		ctx.strokeStyle = p.trailColor;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(p.x, p.y + 12);
		ctx.stroke();
	} else if (p.type === 'spark') {
		const alpha = Math.max(0, p.life / p.maxLife);
		ctx.fillStyle = applyAlpha(p.color, alpha);
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
		ctx.fill();
	} else if (p.type === 'flash') {
		ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.9})`;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
		ctx.fill();
	}
}

function applyAlpha(hex, alpha) {
	// Convert #RRGGBB to rgba string
	const c = hex.replace('#', '');
	const r = parseInt(c.slice(0, 2), 16);
	const g = parseInt(c.slice(2, 4), 16);
	const b = parseInt(c.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---- Emitters ----

function emitConfettiBurst() {
	const count = 90;
	for (let i = 0; i < count; i++) {
		const x = Math.random() * canvas.width;
		const y = canvas.height + 20;
		const speed = 500 + Math.random() * 300;
		particles.push({
			type: 'confetti',
			x,
			y,
			vx: (Math.random() - 0.5) * 180,
			vy: -speed,
			wind: (Math.random() - 0.5) * 120,
			w: 8 + Math.random() * 6,
			h: 12 + Math.random() * 8,
			color: TAILWIND_COLORS[Math.floor(Math.random() * TAILWIND_COLORS.length)],
			spin: Math.random() * Math.PI,
			spinSpeed: (Math.random() - 0.5) * 8,
			life: 2.5 + Math.random() * 1.5,
			last: performance.now()
		});
	}
}

function emitFirework() {
	const startX = canvas.width * (0.1 + Math.random() * 0.8);
	const startY = canvas.height - 10;
	const targetY = canvas.height * (0.2 + Math.random() * 0.35);
	const colorMode = Math.random() < 0.5 ? 'single' : 'multi';
	const palette = colorMode === 'single'
		? [TAILWIND_COLORS[Math.floor(Math.random() * TAILWIND_COLORS.length)]]
		: shuffle(TAILWIND_COLORS).slice(0, 4);

	const rocket = {
		type: 'rocket',
		x: startX,
		y: startY,
		vx: (Math.random() - 0.5) * 30,
		vy: -(420 + Math.random() * 140),
		targetY,
		trailColor: palette[0],
		explode: false,
		life: 1.8 + Math.random() * 0.6,
		last: performance.now()
	};

	particles.push(rocket);

	// Schedule explosion check in loop via flag
	const check = () => {
		if (rocket.explode || rocket.life <= 0) {
			spawnExplosion(rocket.x, rocket.y, palette);
			return;
		}
		requestAnimationFrame(check);
	};
	requestAnimationFrame(check);
}

function spawnExplosion(x, y, palette) {
	const clampedX = Math.min(Math.max(x, 40), canvas.width - 40);
	const clampedY = Math.min(Math.max(y, 60), canvas.height * 0.7);
	const count = 70 + Math.random() * 40;
	const hang = Math.random() < 0.4 ? 0.4 : 0; // sometimes hang briefly
	particles.push({
		type: 'flash',
		x: clampedX,
		y: clampedY,
		r: 30 + Math.random() * 25,
		alpha: 1,
		life: 0.18,
		maxLife: 0.18,
		last: performance.now()
	});
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 140 + Math.random() * 260;
		const color = palette[Math.floor(Math.random() * palette.length)];
		particles.push({
			type: 'spark',
			x: clampedX,
			y: clampedY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			r: 2 + Math.random() * 2.5,
			color,
			life: 1.2 + Math.random() * 0.8 + hang,
			maxLife: 1.2 + Math.random() * 0.8 + hang,
			last: performance.now()
		});
		// Add a few bright highlight flecks
		if (Math.random() < 0.12) {
			particles.push({
				type: 'spark',
				x: clampedX,
				y: clampedY,
				vx: Math.cos(angle) * (speed * 0.6),
				vy: Math.sin(angle) * (speed * 0.6),
				r: 1.4,
				color: '#FFFFFF',
				life: 0.9,
				maxLife: 0.9,
				last: performance.now()
			});
		}
	}
}

function spawnTrail(x, y, color) {
	particles.push({
		type: 'spark',
		x,
		y,
		vx: (Math.random() - 0.5) * 40,
		vy: 80 + Math.random() * 60,
		r: 1.5 + Math.random() * 1.5,
		color,
		life: 0.35 + Math.random() * 0.25,
		maxLife: 0.35 + Math.random() * 0.25,
		last: performance.now()
	});
	// Tiny hot core flicker
	if (Math.random() < 0.3) {
		particles.push({
			type: 'flash',
			x,
			y,
			r: 3 + Math.random() * 3,
			alpha: 1,
			life: 0.12,
			maxLife: 0.12,
			last: performance.now()
		});
	}
}

function shuffle(arr) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// ---- Public API ----

function startNextCelebration(options) {
	if (prefersReducedMotion()) return;
	ensureCanvas();

	// Stop any current run and start a new one
	clearRun();

	const config = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
	const mode = config.type ? 'single' : (config.mode === 'cycle' ? 'cycle' : 'random');
	const forcedType = config.type === 'confetti' || config.type === 'fireworks' ? config.type : null;

	const celebrationTypes = ['confetti', 'fireworks'];
	const chosen = forcedType || (mode === 'random'
		? celebrationTypes[Math.floor(Math.random() * celebrationTypes.length)]
		: null);
	let nextType = mode === 'cycle'
		? (config.startWith === 'fireworks' ? 'fireworks' : 'confetti')
		: chosen;

	const durationMs = 10000;
	const intervalMs = 1000;
	const stopTime = performance.now() + durationMs;

	const tick = () => {
		if (!canvas || !ctx) return;
		const now = performance.now();
		if (now >= stopTime) {
			activeRun = null;
			stopLoopIfIdle();
			return;
		}

		const typeToUse = nextType || 'confetti';
		if (typeToUse === 'confetti') emitConfettiBurst();
		else emitFirework();
		if (mode === 'cycle') {
			nextType = nextType === 'confetti' ? 'fireworks' : 'confetti';
		}

		startLoop();
		activeRun.timerId = setTimeout(tick, intervalMs);
	};

	const run = {
		stop() {
			if (run.timerId) {
				clearTimeout(run.timerId);
				run.timerId = null;
			}
			particles = particles.filter(() => false);
			stopLoopIfIdle();
		},
		timerId: null
	};

	activeRun = run;
	tick();
}

export { startNextCelebration, prefersReducedMotion };
