/** Monta a mensagem do pedido e o link do WhatsApp. */
import { formatBRL, formatPhoneBR, normalizePhoneBR } from '../core/utils.js';

export function formatAddress(address = {}) {
  const street = [address.street, address.number].filter(Boolean).join(', ');
  const place = [address.complement, address.district].filter(Boolean).join(' - ');
  return [street, place, address.city].filter(Boolean).join(' | ');
}

/** Agrupa as escolhas de um item por grupo: [['Frutas', ['Banana', ...]], ...] */
export function groupSelections(item) {
  const groups = new Map();
  for (const pick of item.selections ?? []) {
    const label = pick.price > 0 ? `${pick.name} (+${formatBRL(pick.price)})` : pick.name;
    if (!groups.has(pick.groupName)) groups.set(pick.groupName, []);
    groups.get(pick.groupName).push(label);
  }
  return [...groups.entries()];
}

export function paymentLabel(order) {
  const { payment } = order;
  if (payment.type === 'cash' && payment.changeFor) return `${payment.label} (troco para ${formatBRL(payment.changeFor)})`;
  return payment.label;
}

export function buildOrderMessage(order, store) {
  const lines = [`*Novo pedido ${order.code}*`, store.profile.name, ''];

  lines.push(`*Cliente:* ${order.customer.name}`);
  lines.push(`*WhatsApp:* ${formatPhoneBR(order.customer.phone)}`);
  lines.push(`*Tipo:* ${order.mode === 'delivery' ? 'Entrega' : 'Retirada no local'}`);
  if (order.mode === 'delivery') {
    lines.push(`*Endereço:* ${formatAddress(order.address)}`);
    if (order.address.reference) lines.push(`*Referência:* ${order.address.reference}`);
  }

  lines.push('', '*Itens*');
  for (const item of order.items) {
    lines.push(`${item.qty}x ${item.name} - ${formatBRL(item.unitPrice * item.qty)}`);
    for (const [groupName, names] of groupSelections(item)) lines.push(`   • ${groupName}: ${names.join(', ')}`);
    if (item.note) lines.push(`   _Obs: ${item.note}_`);
  }

  lines.push('', `Subtotal: ${formatBRL(order.totals.subtotal)}`);
  if (order.totals.discount > 0) lines.push(`Desconto (${order.coupon}): -${formatBRL(order.totals.discount)}`);
  if (order.mode === 'delivery') {
    lines.push(`Entrega: ${order.totals.deliveryFee > 0 ? formatBRL(order.totals.deliveryFee) : 'Grátis'}`);
  }
  lines.push(`*Total: ${formatBRL(order.totals.total)}*`, '', `*Pagamento:* ${paymentLabel(order)}`);
  if (order.note) lines.push(`*Observações:* ${order.note}`);

  return lines.join('\n');
}

export function buildWhatsAppUrl(phone, message) {
  return `https://wa.me/${normalizePhoneBR(phone)}?text=${encodeURIComponent(message)}`;
}

/** Código curto do pedido, ex.: "K3F9Q". */
export function createOrderCode() {
  return Date.now().toString(36).slice(-3).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
}
