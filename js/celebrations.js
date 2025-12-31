// Celebration effects extracted from main.js
// Provides a simple interface to trigger the next celebration animation.

function prefersReducedMotion() {
	return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

let activeCelebration = null;
let celebrationIndex = 0;

const CONFETTI_BURST_INTERVAL_MS = 900;
const FIREWORK_DOUBLE_SHOT_CHANCE = 0.45;
const FIREWORK_DOUBLE_SHOT_MIN_GAP_MS = 140;
const FIREWORK_DOUBLE_SHOT_MAX_GAP_MS = 320;
const FIREWORK_SPARKLE_CHANCE = 0.4;

function getAnchorCenter(anchorEl) {
	const rect = anchorEl.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}

function randomConfettiColor() {
	const hue = Math.floor(Math.random() * 360);
	const sat = 85;
	const light = 60;
	return `hsl(${hue} ${sat}% ${light}%)`;
}

function createCelebrationLayer() {
	const container = document.createElement('div');
	container.style.position = 'fixed';
	container.style.inset = '0';
	container.style.pointerEvents = 'none';
	container.style.overflow = 'hidden';
	container.style.zIndex = '2147483647';
	document.body.appendChild(container);
	return container;
}

function spawnConfettiBurst(container, originX, originY, pieceCount = 70) {
	for (let i = 0; i < pieceCount; i++) {
		const piece = document.createElement('div');
		const size = 6 + Math.random() * 10;
		piece.style.position = 'absolute';
		piece.style.left = `${originX}px`;
		piece.style.top = `${originY}px`;
		piece.style.width = `${size}px`;
		piece.style.height = `${Math.max(4, size * 0.55)}px`;
		piece.style.borderRadius = '2px';
		piece.style.background = randomConfettiColor();
		piece.style.opacity = '1';
		piece.style.transform = 'translate(-50%, -50%)';
		container.appendChild(piece);

		const angle = (Math.PI * 2) * Math.random();
		const velocity = 140 + Math.random() * 220;
		const popXBase = Math.cos(angle) * velocity;
		const launchJitterX = (Math.random() * 2 - 1) * (28 + Math.random() * 54);
		const popX = popXBase + launchJitterX;

		const popY = Math.sin(angle) * velocity - (130 + Math.random() * 200);
		const driftX = (Math.random() * 2 - 1) * (260 + Math.random() * 420);
		const fallY = 700 + Math.random() * 520;
		const sway = (Math.random() * 2 - 1) * (48 + Math.random() * 64);
		const rotate = (Math.random() * 540 - 270);
		const duration = 3600 + Math.random() * 2400;

		const anim = piece.animate(
			[
				{ transform: 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg)', opacity: 1 },
				{ transform: `translate(-50%, -50%) translate(${popXBase}px, ${popY}px) rotate(${rotate * 0.25}deg)`, opacity: 1, offset: 0.16 },
				{ transform: `translate(-50%, -50%) translate(${popX}px, ${popY}px) rotate(${rotate * 0.35}deg)`, opacity: 1, offset: 0.28 },
				{ transform: `translate(-50%, -50%) translate(${popX + sway}px, ${popY + fallY * 0.35}px) rotate(${rotate * 0.75}deg)`, opacity: 1, offset: 0.42 },
				{ transform: `translate(-50%, -50%) translate(${popX - sway}px, ${popY + fallY * 0.75}px) rotate(${rotate}deg)`, opacity: 0.9, offset: 0.64 },
				{ transform: `translate(-50%, -50%) translate(${popX + driftX}px, ${popY + fallY}px) rotate(${rotate * 1.15}deg)`, opacity: 0 }
			],
			{
				duration,
				easing: 'ease-out',
				fill: 'forwards'
			}
		);

		anim.addEventListener('finish', () => {
			piece.remove();
		});
	}
}

function startConfettiCelebration(anchorEl, durationMs = 10000) {
	if (!anchorEl) return { stop() {} };
	if (prefersReducedMotion()) return { stop() {} };

	const container = createCelebrationLayer();
	let stopped = false;

	const startTime = performance.now();
	const burst = () => {
		if (stopped) return;
		const elapsed = performance.now() - startTime;
		if (elapsed > durationMs) {
			stop();
			return;
		}
		const { x, y } = getAnchorCenter(anchorEl);
		spawnConfettiBurst(container, x, y, 50 + Math.floor(Math.random() * 30));
	};

	const burstId = window.setInterval(burst, CONFETTI_BURST_INTERVAL_MS);
	burst();

	const stop = () => {
		if (stopped) return;
		stopped = true;
		window.clearInterval(burstId);
		window.setTimeout(() => container.remove(), 1200);
	};

	return { stop };
}

function spawnFireworkExplosion(container, x, y) {
	const flash = document.createElement('div');
	flash.style.position = 'absolute';
	flash.style.left = `${x}px`;
	flash.style.top = `${y}px`;
	flash.style.width = '10px';
	flash.style.height = '10px';
	flash.style.borderRadius = '9999px';
	flash.style.transform = 'translate(-50%, -50%)';
	flash.style.background = 'white';
	flash.style.opacity = '0.9';
	flash.style.filter = 'brightness(2.2) saturate(1.8)';
	flash.style.boxShadow = '0 0 24px rgba(255,255,255,0.95), 0 0 60px rgba(255,255,255,0.55)';
	flash.style.mixBlendMode = 'screen';
	container.appendChild(flash);
	const flashAnim = flash.animate(
		[
			{ transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
			{ transform: 'translate(-50%, -50%) scale(6)', opacity: 0.0 }
		],
		{ duration: 180, easing: 'ease-out', fill: 'forwards' }
	);
	flashAnim.addEventListener('finish', () => flash.remove());

	if (Math.random() < FIREWORK_SPARKLE_CHANCE) {
		const sparkle = document.createElement('div');
		sparkle.style.position = 'absolute';
		sparkle.style.left = `${x}px`;
		sparkle.style.top = `${y}px`;
		sparkle.style.width = '28px';
		sparkle.style.height = '28px';
		sparkle.style.transform = 'translate(-50%, -50%)';
		sparkle.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0) 70%)';
		sparkle.style.filter = 'brightness(2.6) saturate(1.9)';
		sparkle.style.mixBlendMode = 'screen';
		container.appendChild(sparkle);

		const sparkleAnim = sparkle.animate(
			[
				{ transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.95 },
				{ transform: 'translate(-50%, -50%) scale(1.25)', opacity: 0.55, offset: 0.35 },
				{ transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0 }
			],
			{ duration: 240 + Math.random() * 120, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'forwards' }
		);
		sparkleAnim.addEventListener('finish', () => sparkle.remove());
	}

	const particleCount = 46 + Math.floor(Math.random() * 22);
	for (let i = 0; i < particleCount; i++) {
		const p = document.createElement('div');
		const size = 2 + Math.random() * 3.5;
		p.style.position = 'absolute';
		p.style.left = `${x}px`;
		p.style.top = `${y}px`;
		p.style.width = `${size}px`;
		p.style.height = `${size}px`;
		p.style.borderRadius = '9999px';
		p.style.transform = 'translate(-50%, -50%)';
		p.style.background = randomConfettiColor();
		p.style.opacity = '1';
		p.style.filter = 'brightness(1.9) saturate(1.6)';
		p.style.boxShadow = '0 0 16px rgba(255,255,255,0.22)';
		p.style.mixBlendMode = 'screen';
		container.appendChild(p);

		const angle = (Math.PI * 2) * (i / particleCount) + (Math.random() * 0.22);
		const speed = 160 + Math.random() * 360;
		const dx = Math.cos(angle) * speed;
		const dy = Math.sin(angle) * speed;
		const gravity = 520 + Math.random() * 320;
		const duration = 1700 + Math.random() * 900;

		const anim = p.animate(
			[
				{ transform: 'translate(-50%, -50%) translate(0px, 0px) scale(0.75)', opacity: 1 },
				{ transform: `translate(-50%, -50%) translate(${dx}px, ${dy * 0.65}px) scale(1.05)`, opacity: 0.92, offset: 0.42 },
				{ transform: `translate(-50%, -50%) translate(${dx * 1.08}px, ${dy * 0.85}px) scale(0.98)`, opacity: 0.72, offset: 0.62 },
				{ transform: `translate(-50%, -50%) translate(${dx * 1.15}px, ${dy + gravity}px) scale(0.85)`, opacity: 0 }
			],
			{ duration, delay: Math.random() * 120, easing: 'cubic-bezier(0.2, 0.82, 0.25, 1)', fill: 'forwards' }
		);

		anim.addEventListener('finish', () => p.remove());
	}
}

function launchFirework(container) {
	const startX = Math.floor(window.innerWidth * (0.12 + Math.random() * 0.76));
	const startY = window.innerHeight + 24;
	const endX = startX + (Math.random() * 220 - 110);
	const endY = Math.floor(window.innerHeight * (0.08 + Math.random() * 0.26));

	const curveX = startX + (endX - startX) * (0.35 + Math.random() * 0.35) + (Math.random() * 160 - 80);
	const curveY = startY + (endY - startY) * (0.5 + Math.random() * 0.2);
	const shouldDrop = Math.random() < 0.22;
	const dropPx = shouldDrop ? (20 + Math.random() * 90) : 0;
	const finalX = endX;
	const finalY = endY + dropPx;

	const rocket = document.createElement('div');
	rocket.style.position = 'absolute';
	rocket.style.left = `${startX}px`;
	rocket.style.top = `${startY}px`;
	rocket.style.width = '10px';
	rocket.style.height = '10px';
	rocket.style.borderRadius = '9999px';
	rocket.style.transform = 'translate(-50%, -50%)';
	rocket.style.background = 'linear-gradient(180deg, #ffd166 0%, #ff7a18 70%)';
	rocket.style.opacity = '0.9';
	rocket.style.filter = 'brightness(1.25) saturate(1.2)';
	rocket.style.boxShadow = '0 0 12px rgba(255,193,79,0.75), 0 0 22px rgba(255,122,24,0.55)';
	rocket.style.mixBlendMode = 'screen';
	container.appendChild(rocket);

	let emberIntervalId = null;
	const spawnEmber = () => {
		if (!rocket.isConnected) {
			if (emberIntervalId) {
				window.clearInterval(emberIntervalId);
				emberIntervalId = null;
			}
			return;
		}
		const rect = rocket.getBoundingClientRect();
		if (!rect.width && !rect.height) return;

		const ember = document.createElement('div');
		ember.style.position = 'absolute';
		ember.style.left = `${rect.left + rect.width / 2}px`;
		ember.style.top = `${rect.top + rect.height / 2}px`;
		ember.style.width = `${6 + Math.random() * 6}px`;
		ember.style.height = `${14 + Math.random() * 12}px`;
		ember.style.borderRadius = '9999px';
		ember.style.transform = 'translate(-50%, -50%)';
		ember.style.background = 'radial-gradient(circle at 30% 25%, rgba(255,214,102,0.95), rgba(255,122,24,0.75) 55%, rgba(80,18,0,0))';
		ember.style.opacity = '0.9';
		ember.style.filter = 'blur(0.6px) brightness(1.2) saturate(1.15)';
		ember.style.mixBlendMode = 'screen';
		ember.style.boxShadow = '0 0 10px rgba(255,193,79,0.8), 0 0 18px rgba(255,122,24,0.6)';
		container.appendChild(ember);

		const driftX = (Math.random() * 10) - 5;
		const fall = 26 + Math.random() * 34;
		const emberAnim = ember.animate(
			[
				{ transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.9 },
				{ transform: `translate(-50%, -50%) translate(${driftX}px, ${fall}px) scale(1.25)`, opacity: 0 }
			],
			{ duration: 520 + Math.random() * 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' }
		);
		emberAnim.addEventListener('finish', () => ember.remove());
	};

	const stopTrail = () => {
		if (emberIntervalId) {
			window.clearInterval(emberIntervalId);
			emberIntervalId = null;
		}
	};

	spawnEmber();
	emberIntervalId = window.setInterval(spawnEmber, 28 + Math.random() * 18);

	const duration = 700 + Math.random() * 520;
	const explodeLeadMs = 160;
	const trailCutoffMs = Math.max(0, duration - explodeLeadMs - 90);
	const trailCutoffId = window.setTimeout(() => {
		stopTrail();
	}, trailCutoffMs);

	const anim = rocket.animate(
		[
			{ transform: 'translate(-50%, -50%) translate(0px, 0px) scaleX(0.22) scaleY(1.9)', opacity: 0.9 },
			{ transform: `translate(-50%, -50%) translate(${curveX - startX}px, ${curveY - startY}px) scaleX(0.18) scaleY(2.0)`, opacity: 1, offset: 0.55 },
			{ transform: `translate(-50%, -50%) translate(${finalX - startX}px, ${finalY - startY}px) scale(1.02)`, opacity: 0.95, offset: 0.92 },
			{ transform: `translate(-50%, -50%) translate(${finalX - startX}px, ${finalY - startY}px) scale(0.78)`, opacity: 0.18 }
		],
		{ duration, easing: 'cubic-bezier(0.15, 0.9, 0.2, 1)', fill: 'forwards' }
	);

	let exploded = false;
	const explodeTimerId = window.setTimeout(() => {
		if (exploded) return;
		exploded = true;
		window.clearTimeout(trailCutoffId);
		stopTrail();
		rocket.remove();
		spawnFireworkExplosion(container, finalX, finalY);
	}, Math.max(0, duration - explodeLeadMs));

	anim.addEventListener('finish', () => {
		window.clearTimeout(explodeTimerId);
		window.clearTimeout(trailCutoffId);
		if (exploded) return;
		exploded = true;
		stopTrail();
		rocket.remove();
		spawnFireworkExplosion(container, finalX, finalY);
	});
}

function startFireworksCelebration(anchorEl, durationMs = 10000) {
	if (prefersReducedMotion()) return { stop() {} };

	const container = createCelebrationLayer();
	let stopped = false;
	const startTime = performance.now();

	const launch = () => {
		if (stopped) return;
		const elapsed = performance.now() - startTime;
		if (elapsed > durationMs) {
			stop();
			return;
		}
		const doubleShot = Math.random() < FIREWORK_DOUBLE_SHOT_CHANCE;
		launchFirework(container);
		if (doubleShot) {
			const gap = FIREWORK_DOUBLE_SHOT_MIN_GAP_MS + Math.random() * (FIREWORK_DOUBLE_SHOT_MAX_GAP_MS - FIREWORK_DOUBLE_SHOT_MIN_GAP_MS);
			window.setTimeout(() => {
				if (!stopped) {
					launchFirework(container);
				}
			}, gap);
		}
	};

	launch();
	window.setTimeout(launch, 180);
	const launchId = window.setInterval(launch, 1600);

	const stop = () => {
		if (stopped) return;
		stopped = true;
		window.clearInterval(launchId);
		window.setTimeout(() => container.remove(), 2200);
	};

	return { stop };
}

const CELEBRATIONS = [
	{
		id: 'confetti',
		start: (anchorEl) => startConfettiCelebration(anchorEl, 10000)
	},
	{
		id: 'fireworks',
		start: (anchorEl) => startFireworksCelebration(anchorEl, 10000)
	}
];

function stopCelebrationIfActive() {
	if (activeCelebration && typeof activeCelebration.stop === 'function') {
		activeCelebration.stop();
	}
	activeCelebration = null;
}

function startNextCelebration(anchorEl) {
	stopCelebrationIfActive();
	if (prefersReducedMotion()) return;
	const next = CELEBRATIONS[celebrationIndex % CELEBRATIONS.length];
	celebrationIndex = (celebrationIndex + 1) % CELEBRATIONS.length;
	activeCelebration = next.start(anchorEl);
}

export {
	startNextCelebration,
	stopCelebrationIfActive,
	prefersReducedMotion
};

