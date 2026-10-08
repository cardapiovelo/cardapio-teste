import { h } from '../../core/dom.js';
import { formatBRL, plural, safeUrl, uid } from '../../core/utils.js';
import { hasPromo, hasVariablePrice, startingPrice } from '../../domain/pricing.js';
import { normalizeText } from '../../domain/search.js';
import { emptyState } from '../../ui/empty-state.js';
import { icon } from '../../ui/icons.js';
import { confirmDialog } from '../../ui/modal.js';
import { btn, iconButton, pageHeader, panel, selectInput, textInput, toggle } from '../ui/form.js';
import { openProductEditor } from './product-editor.js';

export const id = 'produtos';
export const label = 'Produtos';
export const iconName = 'bowl';

/** Cópia com ids novos (produto, grupos e opções). */
function cloneProduct(product) {
  return {
    ...structuredClone(product),
    id: uid('prod'),
    name: `${product.name} (cópia)`,
    optionGroups: product.optionGroups.map((group) => ({
      ...structuredClone(group),
      id: uid('grp'),
      options: group.options.map((option) => ({ ...option, id: uid('opt') })),
    })),
  };
}

/** Troca o produto de lugar com o vizinho da mesma categoria. */
function moveWithinCategory(products, productId, step) {
  const index = products.findIndex((product) => product.id === productId);
  const categoryId = products[index].categoryId;
  const siblings = products.map((product, position) => ({ product, position })).filter((entry) => entry.product.categoryId === categoryId);
  const at = siblings.findIndex((entry) => entry.product.id === productId);
  const neighbor = siblings[at + step];
  if (!neighbor) return;
  [products[index], products[neighbor.position]] = [products[neighbor.position], products[index]];
}

export function render(container, ctx) {
  const { categories, products } = ctx.store;
  const state = { query: '', categoryId: 'all' };

  if (!categories.length) {
    container.replaceChildren(
      pageHeader('Produtos'),
      emptyState({
        iconName: 'list',
        title: 'Crie uma categoria primeiro',
        text: 'Os produtos ficam dentro de categorias, como "Açaí" ou "Bebidas".',
        action: h('button', { type: 'button', class: 'btn btn--primary', onClick: () => ctx.navigate('categorias') }, 'Criar categoria'),
      }),
    );
    return;
  }

  const change = async (mutator, message) => {
    if (await ctx.commit(mutator, { message })) ctx.refresh();
  };

  const results = h('div', { class: 'product-results' });

  function productRow(product) {
    const src = safeUrl(product.image);
    const price = startingPrice(product);
    const active = toggle({
      checked: product.active,
      label: 'Visível',
      onChange: (value) => change((draft) => (draft.products.find((p) => p.id === product.id).active = value), value ? 'Produto visível.' : 'Produto escondido.'),
    });
    const groups = product.optionGroups.length;
    return h(
      'li',
      { class: ['product-row', !product.active && 'is-hidden'] },
      src ? h('img', { class: 'product-row__img', src, alt: '', loading: 'lazy' }) : h('span', { class: 'product-row__img product-row__img--empty' }, icon('bowl', { size: 22 })),
      h(
        'div',
        { class: 'product-row__main' },
        h('strong', { class: 'product-row__name' }, product.name),
        h(
          'span',
          { class: 'product-row__meta' },
          price > 0 || hasVariablePrice(product) ? `${hasVariablePrice(product) ? 'A partir de ' : ''}${formatBRL(price)}` : 'Sem preço',
          groups > 0 ? `, ${groups} ${plural(groups, 'grupo de opções', 'grupos de opções')}` : '',
        ),
        h(
          'span',
          { class: 'badges' },
          product.featured && h('span', { class: 'badge' }, 'Mais vendido'),
          hasPromo(product) && h('span', { class: 'badge badge--accent' }, 'Promoção'),
          product.soldOut && h('span', { class: 'badge badge--danger' }, 'Esgotado'),
        ),
      ),
      h(
        'div',
        { class: 'product-row__tools' },
        active.el,
        h(
          'div',
          { class: 'item-card__tools' },
          iconButton('arrow-up', 'Subir', () => change((draft) => moveWithinCategory(draft.products, product.id, -1), '')),
          iconButton('arrow-down', 'Descer', () => change((draft) => moveWithinCategory(draft.products, product.id, 1), '')),
          iconButton('edit', 'Editar produto', () => openProductEditor({ ctx, product, onSaved: () => ctx.refresh() })),
          iconButton('copy', 'Duplicar produto', () =>
            change((draft) => {
              const index = draft.products.findIndex((p) => p.id === product.id);
              draft.products.splice(index + 1, 0, cloneProduct(product));
            }, 'Produto duplicado.'),
          ),
          iconButton(
            'trash',
            'Excluir produto',
            async () => {
              const ok = await confirmDialog({ title: `Excluir "${product.name}"?`, message: 'Para só tirar do cardápio por um tempo, use "Visível" ou "Esgotado".', confirmLabel: 'Excluir', danger: true });
              if (ok) await change((draft) => (draft.products = draft.products.filter((p) => p.id !== product.id)), 'Produto excluído.');
            },
            { danger: true },
          ),
        ),
      ),
    );
  }

  function drawResults() {
    const query = normalizeText(state.query);
    const groups = categories
      .filter((category) => state.categoryId === 'all' || category.id === state.categoryId)
      .map((category) => ({
        category,
        items: products.filter((product) => product.categoryId === category.id && (!query || normalizeText(product.name).includes(query))),
      }))
      .filter((group) => group.items.length);

    results.replaceChildren(
      ...(groups.length
        ? groups.map((group) =>
            h(
              'section',
              { class: 'panel' },
              h('h2', { class: 'panel__title' }, group.category.name, !group.category.active && h('span', { class: 'badge' }, 'Categoria escondida')),
              h('ul', { class: 'product-rows' }, group.items.map(productRow)),
              h('div', { class: 'actions' }, btn('Novo produto nesta categoria', { iconName: 'plus', onClick: () => openProductEditor({ ctx, product: null, categoryId: group.category.id, onSaved: () => ctx.refresh() }) })),
            ),
          )
        : [
            emptyState({
              iconName: 'search',
              title: products.length ? 'Nada encontrado' : 'Nenhum produto ainda',
              text: products.length ? 'Tente outro nome ou outra categoria.' : 'Cadastre o primeiro produto com o botão "Novo produto".',
            }),
          ]),
    );
  }

  const search = textInput({ type: 'search', placeholder: 'Buscar produto', 'aria-label': 'Buscar produto' });
  search.addEventListener('input', () => {
    state.query = search.value;
    drawResults();
  });
  const filter = selectInput({ value: 'all', options: [{ value: 'all', label: 'Todas as categorias' }, ...categories.map((c) => ({ value: c.id, label: c.name }))], 'aria-label': 'Filtrar por categoria' });
  filter.addEventListener('change', () => {
    state.categoryId = filter.value;
    drawResults();
  });

  drawResults();
  container.replaceChildren(
    pageHeader('Produtos', `${products.length} ${plural(products.length, 'produto', 'produtos')} no cardápio.`, btn('Novo produto', { variant: 'primary', iconName: 'plus', onClick: () => openProductEditor({ ctx, product: null, onSaved: () => ctx.refresh() }) })),
    h('div', { class: 'toolbar' }, search, filter),
    results,
  );
}
