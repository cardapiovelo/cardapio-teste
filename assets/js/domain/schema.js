/**
 * Modelo de dados da loja + normalização.
 * `normalizeStore` aceita qualquer objeto (vindo do localStorage, da API ou de
 * um backup importado) e devolve sempre um objeto completo e válido.
 */
import { normalizePhoneBR, round2, safeUrl, uid } from '../core/utils.js';

export const SCHEMA_VERSION = 1;

export const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const TIME_ZONES = Object.freeze([
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Nordeste (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
]);

export const DEFAULT_THEME = Object.freeze({ primary: '#3b1452', accent: '#f4c430' });

export const DEFAULT_SETTINGS = Object.freeze({
  timeZone: 'America/Sao_Paulo',
  forceStatus: 'auto', // 'auto' | 'open' | 'closed'
  allowOrdersWhenClosed: false,
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: 0,
  freeDeliveryAbove: 0, // 0 = desligado
  minOrder: 0,
  deliveryTimeMin: 60,
  pickupTimeMin: 20,
});

/* ---------- helpers de saneamento ---------- */

const text = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const amount = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? round2(n) : fallback;
};
const integer = (value, fallback = 0) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const flag = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const list = (value) => (Array.isArray(value) ? value : []);
const hhmm = (value, fallback) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback);
const hex = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback);
const identifier = (value, prefix) => (typeof value === 'string' && /^[\w-]{1,48}$/.test(value) ? value : uid(prefix));
const image = (value) => {
  const url = safeUrl(value);
  return url.length <= 600000 ? url : '';
};

function validTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/* ---------- partes do modelo ---------- */

export const defaultHours = () =>
  DAYS.map((_, day) => ({ day, open: true, from: '10:00', to: '22:00' }));

export const defaultPayments = () => [
  { id: 'cash', type: 'cash', label: 'Dinheiro', enabled: true, note: '', askChange: true },
  { id: 'credit', type: 'card', label: 'Cartão de crédito', enabled: true, note: 'Levamos a máquina até você.' },
  { id: 'debit', type: 'card', label: 'Cartão de débito', enabled: true, note: 'Levamos a máquina até você.' },
  { id: 'pix', type: 'pix', label: 'Pix', enabled: true, note: '', pixKey: '' },
];

function normalizeHours(raw) {
  const byDay = new Map(list(raw).map((entry) => [Number(entry?.day), entry]));
  return defaultHours().map((fallback) => {
    const entry = byDay.get(fallback.day) ?? {};
    return {
      day: fallback.day,
      open: flag(entry.open, fallback.open),
      from: hhmm(entry.from, fallback.from),
      to: hhmm(entry.to, fallback.to),
    };
  });
}

function normalizePayment(raw = {}) {
  const type = ['cash', 'card', 'pix', 'other'].includes(raw.type) ? raw.type : 'other';
  const payment = {
    id: identifier(raw.id, 'pay'),
    type,
    label: text(raw.label, 40) || 'Pagamento',
    enabled: flag(raw.enabled, true),
    note: text(raw.note, 140),
  };
  if (type === 'cash') payment.askChange = flag(raw.askChange, true);
  if (type === 'pix') payment.pixKey = text(raw.pixKey, 140);
  return payment;
}

function normalizeCategory(raw = {}) {
  return {
    id: identifier(raw.id, 'cat'),
    name: text(raw.name, 60) || 'Categoria',
    active: flag(raw.active, true),
  };
}

function normalizeOption(raw = {}) {
  return {
    id: identifier(raw.id, 'opt'),
    name: text(raw.name, 80) || 'Opção',
    price: amount(raw.price),
    active: flag(raw.active, true),
  };
}

function normalizeGroup(raw = {}) {
  const type = raw.type === 'multiple' ? 'multiple' : 'single';
  const options = list(raw.options).map(normalizeOption);
  let min = integer(raw.min);
  let max = integer(raw.max);
  const wantsRequired = flag(raw.required, min > 0);

  if (type === 'single') {
    min = wantsRequired ? 1 : 0;
    max = 1;
  } else {
    if (wantsRequired && min < 1) min = 1;
    if (!wantsRequired) min = 0;
    if (max > 0 && max < min) max = min;
  }
  return {
    id: identifier(raw.id, 'grp'),
    name: text(raw.name, 60) || 'Opções',
    type,
    required: min > 0,
    min,
    max, // 0 = sem limite (só em múltipla escolha)
    options,
  };
}

function normalizeProduct(raw = {}) {
  const price = amount(raw.price);
  const hasPromo = raw.promoPrice !== null && raw.promoPrice !== undefined && raw.promoPrice !== '';
  const promoPrice = hasPromo ? amount(raw.promoPrice, null) : null;
  return {
    id: identifier(raw.id, 'prod'),
    categoryId: text(raw.categoryId, 48),
    name: text(raw.name, 120) || 'Produto',
    description: text(raw.description, 600),
    image: image(raw.image),
    price,
    promoPrice: promoPrice !== null && promoPrice < price ? promoPrice : null,
    active: flag(raw.active, true),
    featured: flag(raw.featured),
    soldOut: flag(raw.soldOut),
    optionGroups: list(raw.optionGroups).map(normalizeGroup),
  };
}

function normalizeCoupon(raw = {}) {
  const type = raw.type === 'fixed' ? 'fixed' : 'percent';
  const value = amount(raw.value);
  return {
    id: identifier(raw.id, 'cup'),
    code: text(raw.code, 20).toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
    type,
    value: type === 'percent' ? Math.min(value, 100) : value,
    minOrder: amount(raw.minOrder),
    active: flag(raw.active, true),
  };
}

/* ---------- API pública ---------- */

export function normalizeStore(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const profile = src.profile ?? {};
  const address = profile.address ?? {};
  const theme = src.theme ?? {};
  const settings = src.settings ?? {};

  const categories = list(src.categories).map(normalizeCategory);
  const categoryIds = new Set(categories.map((category) => category.id));
  const products = list(src.products)
    .map(normalizeProduct)
    .filter((product) => categoryIds.has(product.categoryId));

  return {
    version: SCHEMA_VERSION,
    slug: text(src.slug, 40),
    profile: {
      name: text(profile.name, 80) || 'Minha loja',
      tagline: text(profile.tagline, 120),
      about: text(profile.about, 1200),
      logo: image(profile.logo),
      cover: image(profile.cover),
      whatsapp: normalizePhoneBR(text(profile.whatsapp, 25)),
      instagram: text(profile.instagram, 40).replace(/^@/, ''),
      address: {
        street: text(address.street, 120),
        number: text(address.number, 12),
        complement: text(address.complement, 60),
        district: text(address.district, 60),
        city: text(address.city, 60),
        state: text(address.state, 2).toUpperCase(),
      },
    },
    theme: {
      primary: hex(theme.primary, DEFAULT_THEME.primary),
      accent: hex(theme.accent, DEFAULT_THEME.accent),
    },
    settings: {
      timeZone: validTimeZone(settings.timeZone) ? settings.timeZone : DEFAULT_SETTINGS.timeZone,
      forceStatus: ['auto', 'open', 'closed'].includes(settings.forceStatus) ? settings.forceStatus : 'auto',
      allowOrdersWhenClosed: flag(settings.allowOrdersWhenClosed),
      deliveryEnabled: flag(settings.deliveryEnabled, true),
      pickupEnabled: flag(settings.pickupEnabled, true),
      deliveryFee: amount(settings.deliveryFee),
      freeDeliveryAbove: amount(settings.freeDeliveryAbove),
      minOrder: amount(settings.minOrder),
      deliveryTimeMin: integer(settings.deliveryTimeMin, DEFAULT_SETTINGS.deliveryTimeMin),
      pickupTimeMin: integer(settings.pickupTimeMin, DEFAULT_SETTINGS.pickupTimeMin),
    },
    hours: normalizeHours(src.hours),
    payments: Array.isArray(src.payments) ? src.payments.map(normalizePayment) : defaultPayments(),
    categories,
    products,
    coupons: list(src.coupons).map(normalizeCoupon).filter((coupon) => coupon.code.length >= 3),
  };
}

/** Loja nova e vazia, pronta para ser preenchida no painel. */
export function createDefaultStore({ slug, name }) {
  return normalizeStore({ slug, profile: { name } });
}
