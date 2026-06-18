const CACHE_NAME = "patuxai-pops-pos-20260618";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css",
  "./config.js",
  "./common.js",
  "./pos.js",
  "./admin.js",
  "./manifest.webmanifest",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/products/mango-passion.png",
  "./assets/products/strawberry-milk.png",
  "./assets/products/pistachio.png",
  "./assets/products/coconut-butterfly-pea.png",
  "./assets/products/lychee-rose-soda.png",
  "./assets/products/patuxai-sunset-soda.png",
  "./assets/products/peach-jasmine-sparkle.png",
  "./assets/products/grapefruit-sparkle.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(response => response || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
