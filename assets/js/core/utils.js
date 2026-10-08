/** Funções puras e sem DOM: seguras de usar no navegador e no servidor. */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const formatBRL = (value) => BRL.format(Number(value) || 0);

/** Converte "12,50", "1.234,56", "12.5" ou 12.5 em número. */
export function parseMoney(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? round2(input) : 0;
  let raw = String(input ?? '').replace(/[^\d,.-]/g, '');
  if (!raw) return 0;
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
  else if ((raw.match(/\./g) || []).length > 1) raw = raw.replace(/\./g, '');
  else if (/^-?\d{1,3}\.\d{3}$/.test(raw)) raw = raw.replace('.', '');
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? round2(value) : 0;
}

/** Valor para exibir em campos de texto: 12.5 -> "12,50". */
export const formatMoneyInput = (value) => (Number(value) || 0).toFixed(2).replace('.', ',');

export function uid(prefix = 'id') {
  const bytes = new Uint8Array(5);
  globalThis.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
  return `${prefix}_${code}`;
}

export function slugify(text, max = 40) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Telefone para o wa.me: só dígitos, com DDI 55 quando faltar. */
export function normalizePhoneBR(value) {
  const digits = onlyDigits(value).replace(/^0+/, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** (18) 99702-0377 */
export function formatPhoneBR(value) {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return String(value ?? '');
}

/** Máscara progressiva para campos de telefone. */
export function maskPhoneInput(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** 90 -> "1h30", 30 -> "30 min". */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const plural = (count, one, many) => (count === 1 ? one : many);

/** Só deixa passar URLs de imagem seguras (nada de javascript:). */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
  return value;
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
