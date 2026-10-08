/**
 * Driver "api": conversa com o servidor Node (pasta /server).
 * Cada loja tem endereço próprio, senha de administrador e imagens no servidor.
 * O cardápio público é guardado em cache para abrir mesmo sem internet.
 */
import { CONFIG } from '../config.js';
import { normalizeStore } from '../domain/schema.js';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function createApiDriver() {
  const ns = CONFIG.storageNamespace;
  const tokenKey = (slug) => `${ns}:token:${slug}`;
  const cacheKey = (slug) => `${ns}:cache:${slug}`;

  const readToken = (slug) => {
    try {
      const saved = JSON.parse(localStorage.getItem(tokenKey(slug)) ?? 'null');
      return saved && saved.expiresAt > Date.now() ? saved : null;
    } catch {
      return null;
    }
  };

  const saveToken = (slug, { token, expiresAt }) =>
    localStorage.setItem(tokenKey(slug), JSON.stringify({ token, expiresAt }));

  async function request(path, { method = 'GET', body, raw = false, token, headers = {} } = {}) {
    const init = { method, headers: { ...headers }, cache: 'no-store' };
    if (token) init.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) {
      if (raw) init.body = body;
      else {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }
    }

    let response;
    try {
      response = await fetch(`${CONFIG.apiBase}${path}`, init);
    } catch {
      throw new ApiError('Sem conexão com o servidor.', 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(data.error || `Erro ${response.status}`, response.status);
    return data;
  }

  const authed = (slug) => {
    const session = readToken(slug);
    if (!session) throw new ApiError('Sessão expirada. Entre novamente.', 401);
    return session.token;
  };

  async function guarded(slug, call) {
    try {
      return await call(authed(slug));
    } catch (error) {
      if (error.status === 401) localStorage.removeItem(tokenKey(slug));
      throw error;
    }
  }

  return {
    name: 'api',
    requiresAuth: true,

    async load(slug) {
      try {
        const store = await request(`/stores/${slug}`);
        localStorage.setItem(cacheKey(slug), JSON.stringify(store));
        return normalizeStore({ ...store, slug });
      } catch (error) {
        if (error.status === 404) {
          localStorage.removeItem(cacheKey(slug));
          return null;
        }
        if (error.status === 0) {
          const cached = localStorage.getItem(cacheKey(slug));
          if (cached) return normalizeStore({ ...JSON.parse(cached), slug });
        }
        throw error;
      }
    },

    async save(slug, store) {
      await guarded(slug, (token) => request(`/stores/${slug}`, { method: 'PUT', body: store, token }));
    },

    async create({ slug, name, password, store }) {
      const result = await request('/stores', { method: 'POST', body: { slug, name, password, store } });
      saveToken(slug, result);
      return normalizeStore({ ...result.store, slug });
    },

    async login(slug, password) {
      saveToken(slug, await request(`/stores/${slug}/login`, { method: 'POST', body: { password } }));
    },

    logout(slug) {
      localStorage.removeItem(tokenKey(slug));
    },

    isAuthenticated: (slug) => Boolean(readToken(slug)),

    async changePassword(slug, current, next) {
      await guarded(slug, (token) =>
        request(`/stores/${slug}/password`, { method: 'POST', body: { current, next }, token }),
      );
    },

    async uploadImage(slug, blob) {
      const result = await guarded(slug, (token) =>
        request(`/stores/${slug}/upload`, {
          method: 'POST',
          body: blob,
          raw: true,
          token,
          headers: { 'Content-Type': blob.type },
        }),
      );
      return result.url;
    },
  };
}
