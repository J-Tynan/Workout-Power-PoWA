const CACHE_NAME = 'Workout-PWA-Power-v2';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  // Add more as we create them
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );

  // Activate the updated service worker ASAP
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isWorkoutData = url.origin === self.location.origin && url.pathname.includes('/data/workouts/');

  // Workout JSON should be network-first so newly added workouts show up immediately.
  if (isWorkoutData) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (err) {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // Default: cache-first for app shell.
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});