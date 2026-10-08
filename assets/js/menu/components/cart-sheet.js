import { h } from '../../core/dom.js';
import { formatBRL } from '../../core/utils.js';
import { groupSelections } from '../../domain/whatsapp.js';
import { emptyState } from '../../ui/empty-state.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/modal.js';
import { stepper } from '../../ui/stepper.js';

function cartLine(item, cart) {
  const details = groupSelections(item).map(([groupName, names]) =>
    h('li', {}, h('span', {}, `${groupName}: `), names.join(', ')),
  );
  return h(
    'li',
    { class: 'cart-line' },
    h(
      'div',
      { class: 'cart-line__info' },
      h('p', { class: 'cart-line__name' }, item.name),
      details.length > 0 && h('ul', { class: 'cart-line__details' }, details),
      item.note && h('p', { class: 'cart-line__note' }, `Obs.: ${item.note}`),
      h(
        'div',
        { class: 'cart-line__actions' },
        stepper({ value: item.qty, min: 1, max: 99, label: item.name, onChange: (qty) => cart.setQty(item.key, qty) }).el,
        h(
          'button',
          { type: 'button', class: 'link-btn link-btn--danger', onClick: () => cart.remove(item.key) },
          icon('trash', { size: 16 }),
          'Remover',
        ),
      ),
    ),
    h('p', { class: 'cart-line__total' }, formatBRL(item.unitPrice * item.qty)),
  );
}

/**
 * Carrinho em gaveta. Atualiza sozinho quando o carrinho muda.
 * @param {{ cart, store, onCheckout: () => void }} params
 */
export function openCartSheet({ cart, store, onCheckout }) {
  let unsubscribe = () => {};
  const sheet = openSheet({ title: 'Seu carrinho', body: '', onClose: () => unsubscribe() });

  const render = () => {
    if (cart.items.length === 0) {
      sheet.body.replaceChildren(
        emptyState({
          iconName: 'cart',
          title: 'Seu carrinho está vazio',
          text: 'Escolha um produto no cardápio e ele aparece aqui.',
          action: h('button', { type: 'button', class: 'btn btn--primary', onClick: () => sheet.close() }, 'Ver o cardápio'),
        }),
      );
      sheet.setFooter();
      return;
    }

    const { minOrder } = store.settings;
    const subtotal = cart.subtotal();
    const missing = minOrder - subtotal;

    sheet.body.replaceChildren(
      h('ul', { class: 'cart-list' }, cart.items.map((item) => cartLine(item, cart))),
      missing > 0 && h('p', { class: 'notice notice--warn' }, `Faltam ${formatBRL(missing)} para o pedido mínimo de ${formatBRL(minOrder)}.`),
    );

    sheet.setFooter(
      h('div', { class: 'footer-total' }, h('span', {}, 'Subtotal'), h('strong', {}, formatBRL(subtotal))),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary btn--grow',
          disabled: missing > 0,
          onClick: () => {
            sheet.close();
            onCheckout();
          },
        },
        'Continuar',
      ),
    );
  };

  unsubscribe = cart.subscribe(render);
  render();
  return sheet;
}
