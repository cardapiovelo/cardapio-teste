/**
 * Cada loja instala o app com o próprio nome e cor.
 * O manifest estático (manifest.webmanifest) serve de base; aqui trocamos
 * nome, cor e endereço inicial por um manifest gerado na hora.
 */
export function applyStoreManifest(store, slug) {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return;

  const base = new URL('./', document.baseURI);
  const abs = (path) => new URL(path, base).href;
  const name = store.profile.name;

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
    description: store.profile.tagline || `Cardápio de ${name}`,
    id: abs(`?loja=${slug}`),
    start_url: abs(`?loja=${slug}`),
    scope: base.href,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    background_color: '#ffffff',
    theme_color: store.theme.primary,
    icons: [
      { src: abs('assets/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: abs('assets/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: abs('assets/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  link.setAttribute('href', URL.createObjectURL(blob));
}
