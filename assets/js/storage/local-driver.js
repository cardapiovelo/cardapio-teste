/**
 * Driver "local": guarda a loja no localStorage do navegador.
 * Ótimo para demonstração e para uso individual, sem servidor.
 * Os dados ficam só neste aparelho/navegador.
 */
import { CONFIG } from '../config.js';
import { blobToDataUrl } from '../core/image.js';
import { createDemoStore } from '../domain/demo-data.js';
import { createDefaultStore, normalizeStore } from '../domain/schema.js';

const keyFor = (slug) => `${CONFIG.storageNamespace}:store:${slug}`;

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('O armazenamento do navegador está cheio. Use imagens menores ou o modo servidor.');
  }
}

export function createLocalDriver() {
  return {
    name: 'local',
    requiresAuth: false,

    async load(slug) {
      const saved = readJson(keyFor(slug));
      if (saved) return normalizeStore({ ...saved, slug });
      if (slug === CONFIG.defaultSlug) {
        const demo = createDemoStore(slug);
        writeJson(keyFor(slug), demo);
        return demo;
      }
      return null;
    },

    async save(slug, store) {
      writeJson(keyFor(slug), normalizeStore({ ...store, slug }));
    },

    async create({ slug, name }) {
      if (readJson(keyFor(slug))) throw new Error('Esse endereço já está em uso neste navegador.');
      const store = createDefaultStore({ slug, name });
      writeJson(keyFor(slug), store);
      return store;
    },

    isAuthenticated: () => true,
    async login() {},
    logout() {},
    async changePassword() {
      throw new Error('No modo local não há senha.');
    },

    /** No modo local a imagem vira data URL dentro do próprio JSON da loja. */
    async uploadImage(_slug, blob) {
      return blobToDataUrl(blob);
    },
  };
}
