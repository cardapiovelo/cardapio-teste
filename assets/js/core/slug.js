import { CONFIG } from '../config.js';

/** Endereços que não podem virar o nome de uma loja. */
export const RESERVED_SLUGS = Object.freeze([
  'admin', 'api', 'assets', 'uploads', 'public', 'index', 'sw', 'manifest', 'login', 'static',
]);

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const isValidSlug = (slug) => SLUG_PATTERN.test(String(slug)) && !RESERVED_SLUGS.includes(slug);

/** Descobre a loja pela URL (?loja=slug). */
export function resolveSlug(search = globalThis.location?.search ?? '', fallback = CONFIG.defaultSlug) {
  const value = new URLSearchParams(search).get('loja')?.trim().toLowerCase();
  return value && isValidSlug(value) ? value : fallback;
}
