module.exports = {
  globDirectory: "build/",
  globPatterns: [
    "**/*.{json,ico,html,png,txt,css,js}"
  ],
  globIgnores: [
    "index.html"
  ],
  swDest: "build/service-worker.js",
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request, sameOrigin }) => sameOrigin && ['script', 'style', 'font', 'image'].includes(request.destination),
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ url }) => url.origin === 'https://favicon.im',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'favicon-api',
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    }
  ]
};
