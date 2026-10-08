import { h } from '../../core/dom.js';
import { formatBRL, safeUrl } from '../../core/utils.js';
import { effectivePrice, hasPromo, hasVariablePrice, startingPrice } from '../../domain/pricing.js';
import { emptyState } from '../../ui/empty-state.js';
import { icon } from '../../ui/icons.js';

function priceBlock(product) {
  const variable = hasVariablePrice(product);
  const current = startingPrice(product);
  const original = hasPromo(product) ? startingPrice(product, { withPromo: false }) : null;
  return h(
    'span',
    { class: 'product-card__price' },
    variable && h('small', {}, 'a partir de'),
    h('strong', {}, formatBRL(current)),
    original !== null && h('s', {}, formatBRL(original)),
  );
}

function thumbnail(product) {
  const src = safeUrl(product.image);
  return src
    ? h('img', { class: 'product-card__img', src, alt: '', loading: 'lazy', decoding: 'async' })
    : h('span', { class: 'product-card__img product-card__img--empty', 'aria-hidden': 'true' }, icon('bowl', { size: 30 }));
}

function productCard(product, onOpen) {
  const isFree = effectivePrice(product) === 0 && !hasVariablePrice(product);
  return h(
    'button',
    {
      type: 'button',
      class: ['product-card', product.soldOut && 'is-sold-out'],
      disabled: product.soldOut,
      onClick: () => onOpen(product),
    },
    h(
      'span',
      { class: 'product-card__body' },
      h('span', { class: 'product-card__name' }, product.name),
      product.description && h('span', { class: 'product-card__desc' }, product.description),
      product.soldOut ? h('span', { class: 'product-card__badge' }, 'Esgotado') : !isFree && priceBlock(product),
    ),
    thumbnail(product),
  );
}

export function renderProductList(root, sections, { onOpen, query = '' }) {
  root.replaceChildren();
  if (!sections.length) {
    root.append(
      emptyState({
        iconName: 'search',
        title: query ? 'Nada encontrado' : 'Cardápio em preparação',
        text: query ? `Não achamos nada para "${query}". Tente outra palavra.` : 'Ainda não há produtos cadastrados.',
      }),
    );
    return;
  }
  for (const section of sections) {
    root.append(
      h(
        'section',
        { class: 'menu-section', id: `section-${section.id}`, dataset: { section: section.id }, 'aria-label': section.title },
        h('h2', { class: 'menu-section__title' }, section.title),
        h('div', { class: 'product-grid' }, section.products.map((product) => productCard(product, onOpen))),
      ),
    );
  }
}
