import { h } from '../../core/dom.js';
import { formatBRL, formatDateTime, plural } from '../../core/utils.js';
import { buildCartItem, selectionFromItem } from '../../domain/pricing.js';
import { buildOrderMessage, buildWhatsAppUrl } from '../../domain/whatsapp.js';
import { emptyState } from '../../ui/empty-state.js';
import { icon } from '../../ui/icons.js';
import { confirmDialog, openSheet } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { clearOrders, loadOrders } from '../orders.js';

/** Coloca de volta no carrinho o que ainda existe no cardápio, com os preços de hoje. */
function repeatOrder(order, { store, cart }) {
  let added = 0;
  for (const item of order.items) {
    const product = store.products.find((p) => p.id === item.productId && p.active && !p.soldOut);
    const rebuilt = product && buildCartItem(product, selectionFromItem(item), { qty: item.qty, note: item.note });
    if (rebuilt) {
      cart.add(rebuilt);
      added += 1;
    }
  }
  return { added, skipped: order.items.length - added };
}

function orderCard(order, { store, cart, onRepeat }) {
  const count = order.items.reduce((total, item) => total + item.qty, 0);
  const whatsappUrl = buildWhatsAppUrl(store.profile.whatsapp, buildOrderMessage(order, store));
  return h(
    'li',
    { class: 'order-card' },
    h(
      'div',
      { class: 'order-card__head' },
      h('strong', {}, `Pedido ${order.code}`),
      h('time', { datetime: order.createdAt }, formatDateTime(order.createdAt)),
    ),
    h('ul', { class: 'order-card__items' }, order.items.map((item) => h('li', {}, `${item.qty}x ${item.name}`))),
    h(
      'p',
      { class: 'order-card__total' },
      h('span', {}, `${count} ${plural(count, 'item', 'itens')}, ${order.mode === 'delivery' ? 'entrega' : 'retirada'}`),
      h('strong', {}, formatBRL(order.totals.total)),
    ),
    h(
      'div',
      { class: 'order-card__actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--soft btn--small',
          onClick: () => {
            const { added, skipped } = repeatOrder(order, { store, cart });
            if (!added) return toast('Esses produtos não estão mais disponíveis.', { type: 'error' });
            if (skipped) toast(`${skipped} ${plural(skipped, 'item não está', 'itens não estão')} mais disponível.`);
            return onRepeat();
          },
        },
        'Pedir de novo',
      ),
      store.profile.whatsapp &&
        h('a', { class: 'btn btn--ghost btn--small', href: whatsappUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('whatsapp', { size: 16 }), 'Reenviar'),
    ),
  );
}

/** Pedidos feitos neste aparelho. */
export function openHistorySheet({ store, slug, cart, onRepeat }) {
  const orders = loadOrders(slug);

  if (!orders.length) {
    return openSheet({
      title: 'Meus pedidos',
      body: emptyState({ iconName: 'history', title: 'Nenhum pedido ainda', text: 'Quando você fizer um pedido, ele aparece aqui para pedir de novo com um toque.' }),
    });
  }

  const sheet = openSheet({
    title: 'Meus pedidos',
    body: h(
      'ul',
      { class: 'order-list' },
      orders.map((order) =>
        orderCard(order, {
          store,
          cart,
          onRepeat: () => {
            sheet.close();
            onRepeat();
          },
        }),
      ),
    ),
  });

  sheet.setFooter(
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn--ghost btn--block',
        onClick: async () => {
          const ok = await confirmDialog({
            title: 'Apagar histórico?',
            message: 'Os pedidos salvos neste aparelho serão removidos. Isso não cancela nenhum pedido.',
            confirmLabel: 'Apagar',
            danger: true,
          });
          if (ok) {
            clearOrders(slug);
            sheet.close();
          }
        },
      },
      'Apagar histórico',
    ),
  );
  return sheet;
}
