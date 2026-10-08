/** Carrinho do cliente (persistido por loja no localStorage). */
import { CONFIG } from '../config.js';
import { createEmitter } from '../core/events.js';
import { round2 } from '../core/utils.js';
import { buildCartItem, selectionFromItem } from '../domain/pricing.js';

const MAX_QTY = 99;

export function createCart(slug) {
  const storageKey = `${CONFIG.storageNamespace}:cart:${slug}`;
  const emitter = createEmitter();

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  let items = load();

  const commit = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* sem espaço: o carrinho continua funcionando em memória */
    }
    emitter.emit(items);
  };

  const remove = (key) => {
    items = items.filter((item) => item.key !== key);
    commit();
  };

  return {
    subscribe: emitter.subscribe,
    get items() {
      return items;
    },
    count: () => items.reduce((total, item) => total + item.qty, 0),
    subtotal: () => round2(items.reduce((total, item) => total + item.unitPrice * item.qty, 0)),

    add(item) {
      const existing = items.find((entry) => entry.key === item.key);
      if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + item.qty);
      else items = [...items, item];
      commit();
    },

    setQty(key, qty) {
      if (qty <= 0) return remove(key);
      const item = items.find((entry) => entry.key === key);
      if (item) item.qty = Math.min(MAX_QTY, qty);
      return commit();
    },

    remove,

    clear() {
      items = [];
      commit();
    },

    /**
     * Atualiza o carrinho com o cardápio atual: preços novos entram,
     * produtos removidos ou esgotados saem. Devolve quantas linhas saíram.
     */
    reconcile(store) {
      const before = items.length;
      items = items
        .map((item) => {
          const product = store.products.find((p) => p.id === item.productId && p.active && !p.soldOut);
          return product ? buildCartItem(product, selectionFromItem(item), { qty: item.qty, note: item.note }) : null;
        })
        .filter(Boolean);
      commit();
      return before - items.length;
    },
  };
}
