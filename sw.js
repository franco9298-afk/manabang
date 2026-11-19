// 修改網頁後把版本號 +1，手機才會更新快取
const CACHE = "manabang-v2";
const TILES = "mnb-tiles";
const FILES = ["./", "index.html", "manifest.json", "icon.svg"];
const LIB = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
];
const RUNTIME_HOSTS = ["cdnjs.cloudflare.com", "tile.opentopomap.org", "tile.happyman.idv.tw", "tile.openstreetmap.org"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES);
    const t = await caches.open(TILES);
    await Promise.all(LIB.map(async u => { try { if (!(await t.match(u))) await t.put(u, await fetch(u, { mode: "no-cors" })); } catch (e) {} }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const external = RUNTIME_HOSTS.some(h => url.hostname === h || url.hostname.endsWith("." + h));

  if (external) {
    // 地圖圖磚與函式庫：先找快取，沒有才連網並順便存起來
    e.respondWith((async () => {
      const t = await caches.open(TILES);
      const hit = await t.match(e.request.url);
      if (hit) return hit;
      try { const r = await fetch(e.request); t.put(e.request.url, r.clone()); return r; }
      catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }

  if (url.origin === location.origin) {
    // 網頁本身：先用網路（拿到最新版），沒網路才用快取
    e.respondWith(
      fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match("index.html")))
    );
  }
});
