self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (
          key.startsWith("workbox-") ||
          ["static-assets", "favicon-api"].includes(key)
        )
          await caches.delete(key);
      await self.registration.unregister();
      await self.clients.claim();
      for (const client of await self.clients.matchAll({ type: "window" }))
        client.postMessage({ type: "DIAOPICKS_SW_RETIRED" });
    })(),
  ),
);
