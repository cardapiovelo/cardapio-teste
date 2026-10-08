import { h } from '../../core/dom.js';
import { formatBRL } from '../../core/utils.js';
import { icon } from '../../ui/icons.js';

/**
 * Barra fixa no rodapé: Cardápio, Carrinho e Pedidos.
 * @returns {{ setCart: (state: { count: number, subtotal: number }) => void }}
 */
export function renderBottomNav(root, { onMenu, onCart, onHistory }) {
  const badge = h('span', { class: 'tab__badge', hidden: true });
  const total = h('span', { class: 'tab__sub' });
  const cartTab = h(
    'button',
    { type: 'button', class: 'tab tab--cart', onClick: onCart },
    h('span', { class: 'tab__icon' }, icon('cart', { size: 24 }), badge),
    h('span', { class: 'tab__label' }, 'Carrinho'),
    total,
  );

  root.replaceChildren(
    h('button', { type: 'button', class: 'tab is-current', onClick: onMenu }, h('span', { class: 'tab__icon' }, icon('menu', { size: 24 })), h('span', { class: 'tab__label' }, 'Cardápio')),
    cartTab,
    h('button', { type: 'button', class: 'tab', onClick: onHistory }, h('span', { class: 'tab__icon' }, icon('history', { size: 24 })), h('span', { class: 'tab__label' }, 'Pedidos')),
  );

  return {
    setCart({ count, subtotal }) {
      badge.hidden = count === 0;
      badge.textContent = String(count);
      total.textContent = count ? formatBRL(subtotal) : '';
      cartTab.classList.toggle('has-items', count > 0);
      cartTab.setAttribute('aria-label', count ? `Carrinho, ${count} itens, ${formatBRL(subtotal)}` : 'Carrinho vazio');
    },
  };
}
