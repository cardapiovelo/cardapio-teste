/** Histórico de pedidos e dados do cliente neste aparelho. */
import { CONFIG } from '../config.js';

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem espaço: ignora */
  }
};

const ordersKey = (slug) => `${CONFIG.storageNamespace}:orders:${slug}`;
const customerKey = (slug) => `${CONFIG.storageNamespace}:customer:${slug}`;

export const loadOrders = (slug) => {
  const orders = read(ordersKey(slug), []);
  return Array.isArray(orders) ? orders : [];
};

export function saveOrder(slug, order) {
  write(ordersKey(slug), [order, ...loadOrders(slug)].slice(0, CONFIG.orderHistoryLimit));
}

export const clearOrders = (slug) => localStorage.removeItem(ordersKey(slug));

/** Nome, WhatsApp, endereço e forma de pagamento usados da última vez. */
export const loadCustomer = (slug) => read(customerKey(slug), {});

export const saveCustomer = (slug, customer) => write(customerKey(slug), customer);
