const CACHE_NAME = "patuxai-pops-pos-20260721-storage-quota-r19";
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
  "./assets/brand/patuxai-pops-logo.png",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/shapes/shape-patuxai.png"
];

function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";
  cacheUrl.hash = "";
  caches.open(CACHE_NAME)
    .then(cache => cache.put(cacheUrl.toString(), response.clone()))
    .catch(() => {});
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("patuxai-pops-pos-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("patuxai-pops-pos-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const mustRefresh = request.mode === "navigate" || /\.(?:html|css|js)$/.test(url.pathname);
  if (mustRefresh) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          cacheResponse(request, response);
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then(response => response || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        cacheResponse(request, response);
        return response;
      });
    })
  );
});
