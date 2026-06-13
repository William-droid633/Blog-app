/* Service worker minimal et prudent pour Herkul (PWA).
   Stratégie « réseau d'abord » : toujours le contenu frais quand on est en
   ligne, repli sur le cache uniquement hors connexion. Ne touche jamais aux
   requêtes non-GET ni aux domaines tiers (Supabase, etc.). */

const CACHE = "herkul-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // laisse passer Supabase & co.

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const home = await caches.match("/");
          if (home) return home;
        }
        throw new Error("Hors connexion et ressource non mise en cache.");
      }
    })()
  );
});
