import { h } from '../core/dom.js';

/**
 * Aviso rápido no pé da tela. Se houver uma sheet aberta, o aviso entra nela
 * (a camada superior do <dialog> cobriria um aviso colocado no body).
 */
export function toast(message, { type = 'info', duration = 2800 } = {}) {
  const host = [...document.querySelectorAll('dialog[open]')].pop() ?? document.body;
  let region = host.querySelector(':scope > .toast-region');
  if (!region) {
    region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    host.append(region);
  }
  const item = h('div', { class: ['toast', `toast--${type}`] }, message);
  region.append(item);
  setTimeout(() => {
    item.classList.add('is-leaving');
    setTimeout(() => {
      item.remove();
      if (!region.children.length) region.remove();
    }, 220);
  }, duration);
}
