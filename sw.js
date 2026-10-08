/**
 * Service worker do cardápio.
 *  - Guarda o app inteiro no primeiro acesso (lista gerada por scripts/generate-precache.js).
 *  - Páginas: tenta a rede e, sem internet, abre a versão guardada.
 *  - Arquivos: tenta a rede (sempre a versão mais nova) e, sem internet, usa o cache.
 *  - /api/ nunca passa por aqui (sempre rede).
 */
try {
  importScripts('precache-manifest.js');
} catch {
  /* sem a lista, usa só o essencial */
}

const MANIFEST = self.__PRECACHE__ ?? { version: 'dev', urls: ['./', 'index.html', 'admin/'] };
const CACHE = `cardapio-${MANIFEST.version}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(MANIFEST.urls.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('cardapio-') && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(request.mode === 'navigate' ? pageStrategy(request) : assetStrategy(event, request));
});

async function pageStrategy(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    const scopePath = new URL(self.registration.scope).pathname;
    const inAdmin = new URL(request.url).pathname.startsWith(`${scopePath}admin`);
    return (
      (await cache.match(request, { ignoreSearch: true })) ??
      (await cache.match(inAdmin ? 'admin/' : './')) ??
      Response.error()
    );
  }
}

async function assetStrategy(event, request) {
  const cache = await caches.open(CACHE);
  try {
    // "no-cache": confere com o servidor, para nunca usar um arquivo velho do cache do navegador.
    const response = await fetch(new Request(request, { cache: 'no-cache' }));
    if (response.ok) event.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch {
    return (await cache.match(request)) ?? Response.error();
  }
}
