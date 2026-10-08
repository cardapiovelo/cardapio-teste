/** Regras de preço, opções do produto, cupom e totais do pedido. */
import { round2 } from '../core/utils.js';

export const hasPromo = (product) => product.promoPrice !== null && product.promoPrice < product.price;

export const effectivePrice = (product) => (hasPromo(product) ? product.promoPrice : product.price);

const activeOptions = (group) => group.options.filter((option) => option.active);

/** Limites reais de um grupo, considerando só as opções ativas. */
export function groupBounds(group) {
  const available = activeOptions(group).length;
  const min = Math.min(group.min, available);
  const rawMax = group.type === 'single' ? 1 : group.max > 0 ? group.max : available;
  return { min, max: Math.max(Math.min(rawMax, available), min), available };
}

/** Menor preço possível: base + opções obrigatórias mais baratas. */
export function startingPrice(product, { withPromo = true } = {}) {
  let total = withPromo ? effectivePrice(product) : product.price;
  for (const group of product.optionGroups) {
    const { min } = groupBounds(group);
    if (min <= 0) continue;
    const cheapest = activeOptions(group)
      .map((option) => option.price)
      .sort((a, b) => a - b)
      .slice(0, min);
    total += cheapest.reduce((sum, price) => sum + price, 0);
  }
  return round2(total);
}

/** Mostra "A partir de" quando o preço final depende de opções pagas. */
export const hasVariablePrice = (product) =>
  product.optionGroups.some((group) => activeOptions(group).some((option) => option.price > 0));

/**
 * @param selection { [groupId]: Iterable<optionId> }
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateSelection(product, selection = {}) {
  const errors = {};
  for (const group of product.optionGroups) {
    const { min, max } = groupBounds(group);
    const chosen = [...(selection[group.id] ?? [])].filter((id) =>
      group.options.some((option) => option.id === id && option.active),
    );
    if (chosen.length < min) errors[group.id] = min === 1 ? 'Escolha 1 opção' : `Escolha pelo menos ${min}`;
    else if (chosen.length > max) errors[group.id] = `Escolha no máximo ${max}`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function selectionTotal(product, selection = {}) {
  let total = 0;
  for (const group of product.optionGroups) {
    for (const id of selection[group.id] ?? []) {
      const option = group.options.find((item) => item.id === id && item.active);
      if (option) total += option.price;
    }
  }
  return round2(total);
}

/** Cria a linha do carrinho (ou null se a seleção for inválida). */
export function buildCartItem(product, selection = {}, { qty = 1, note = '' } = {}) {
  if (!validateSelection(product, selection).valid) return null;

  const selections = [];
  for (const group of product.optionGroups) {
    for (const id of selection[group.id] ?? []) {
      const option = group.options.find((item) => item.id === id && item.active);
      if (option) {
        selections.push({ groupId: group.id, groupName: group.name, optionId: option.id, name: option.name, price: option.price });
      }
    }
  }
  const cleanNote = String(note).trim();
  const key = [product.id, ...selections.map((s) => s.optionId).sort(), cleanNote.toLowerCase()].join('|');
  return {
    key,
    productId: product.id,
    name: product.name,
    image: product.image,
    qty,
    unitPrice: round2(effectivePrice(product) + selectionTotal(product, selection)),
    selections,
    note: cleanNote,
  };
}

/** Converte as opções salvas num item de volta para o formato de seleção. */
export function selectionFromItem(item) {
  const selection = {};
  for (const pick of item.selections ?? []) (selection[pick.groupId] ??= []).push(pick.optionId);
  return selection;
}

/* ---------- cupom, entrega e totais ---------- */

export function findCoupon(store, code) {
  const normalized = String(code ?? '').trim().toUpperCase();
  return normalized ? (store.coupons.find((coupon) => coupon.code === normalized) ?? null) : null;
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon?.active || subtotal < coupon.minOrder) return 0;
  const raw = coupon.type === 'percent' ? subtotal * (Math.min(coupon.value, 100) / 100) : coupon.value;
  return round2(Math.min(raw, subtotal));
}

export function checkCoupon(store, code, subtotal) {
  const coupon = findCoupon(store, code);
  if (!coupon || !coupon.active) return { ok: false, message: 'Cupom inválido ou expirado.' };
  if (subtotal < coupon.minOrder) {
    return { ok: false, message: `Esse cupom vale para pedidos a partir de R$ ${coupon.minOrder.toFixed(2).replace('.', ',')}.` };
  }
  return { ok: true, coupon };
}

export function deliveryFeeFor(store, mode, subtotal) {
  if (mode !== 'delivery') return 0;
  const { deliveryFee, freeDeliveryAbove } = store.settings;
  return freeDeliveryAbove > 0 && subtotal >= freeDeliveryAbove ? 0 : deliveryFee;
}

export function computeTotals({ items, store, mode, coupon = null }) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));
  const discount = couponDiscount(coupon, subtotal);
  const deliveryFee = deliveryFeeFor(store, mode, subtotal);
  return { subtotal, discount, deliveryFee, total: round2(Math.max(0, subtotal - discount + deliveryFee)) };
}
