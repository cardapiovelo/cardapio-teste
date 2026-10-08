/** Cores da loja → variáveis CSS. */

export const THEME_PRESETS = Object.freeze([
  { name: 'Açaí', primary: '#3b1452', accent: '#f4c430' },
  { name: 'Morango', primary: '#8c1d3f', accent: '#ffb3c1' },
  { name: 'Folha', primary: '#1f5a3d', accent: '#f2d34f' },
  { name: 'Laranja', primary: '#a8470b', accent: '#ffd9a8' },
  { name: 'Oceano', primary: '#12456b', accent: '#7fdbd4' },
  { name: 'Grafite', primary: '#26262b', accent: '#ff7a59' },
]);

/** Escolhe texto claro ou escuro conforme o brilho do fundo. */
export function readableInk(hex) {
  const value = Number.parseInt(String(hex).replace('#', ''), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1d1527' : '#ffffff';
}

export function applyTheme(theme, root = document.documentElement) {
  root.style.setProperty('--c-primary', theme.primary);
  root.style.setProperty('--c-primary-ink', readableInk(theme.primary));
  root.style.setProperty('--c-accent', theme.accent);
  root.style.setProperty('--c-accent-ink', readableInk(theme.accent));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.primary);
}
