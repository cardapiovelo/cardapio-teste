/**
 * Configuração global do front-end.
 * Tudo que você pode querer ajustar sem mexer na lógica fica aqui.
 */
export const CONFIG = Object.freeze({
  appName: 'Cardápio SaaS',

  /** Loja exibida quando a URL não traz ?loja=slug */
  defaultSlug: 'demo',

  /**
   * Onde os dados ficam:
   *  - 'auto'     -> Firebase se firebase-config.js estiver preenchido; senão o servidor
   *                 (API) se existir; senão o navegador (localStorage)
   *  - 'firebase' -> sempre Firebase (SaaS sem servidor, ex.: GitHub Pages)
   *  - 'api'      -> sempre servidor Node (SaaS com várias lojas e login)
   *  - 'local'    -> sempre localStorage (demo / uso individual)
   */
  driver: 'auto',
  apiBase: '/api',

  /** Prefixo das chaves do localStorage */
  storageNamespace: 'cardapio',

  /** Tamanhos máximos (px) das imagens enviadas no painel */
  image: Object.freeze({ product: 640, logo: 256, cover: 1000, quality: 0.8 }),

  /** Quantos pedidos ficam no histórico do cliente */
  orderHistoryLimit: 30,
});
