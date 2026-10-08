import { CONFIG } from '../../config.js';
import { h } from '../../core/dom.js';
import { parseMoney, uid } from '../../core/utils.js';
import { openSheet } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { btn, field, iconButton, moneyInput, numberInput, readMoney, selectInput, textArea, textInput, toggle } from '../ui/form.js';
import { imageField } from '../ui/image-field.js';

/** "Granola; 2,50" ou "Granola | 2,50" ou só "Granola". */
export function parseOptionLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/[;|]/);
      const tail = rest.join(';').trim();
      return { id: uid('opt'), name: name.trim().slice(0, 80), price: /^[\d\s.,R$]+$/.test(tail) ? parseMoney(tail) : 0, active: true };
    })
    .filter((option) => option.name);
}

/** Editor de um grupo de opções (tamanho, sabores, adicionais...). */
function groupEditor(group, { index, total, onMove, onRemove, redraw }) {
  const name = textInput({ value: group.name, maxlength: 60, 'aria-label': 'Nome do grupo de opções' });
  name.addEventListener('input', () => (group.name = name.value));

  const type = selectInput({
    value: group.type,
    options: [
      { value: 'single', label: 'Escolher uma opção' },
      { value: 'multiple', label: 'Escolher várias opções' },
    ],
    'aria-label': 'Tipo de escolha',
  });
  type.addEventListener('change', () => {
    group.type = type.value;
    if (group.type === 'single') group.max = 1;
    redraw();
  });

  const required = toggle({ checked: group.required, label: 'Obrigatório', onChange: (value) => {
    group.required = value;
    if (group.type === 'multiple') group.min = value ? Math.max(1, group.min) : 0;
    redraw();
  } });

  const minInput = numberInput({ value: group.min, min: 0 });
  minInput.addEventListener('change', () => {
    group.min = Number(minInput.value) || 0;
    group.required = group.min > 0;
    redraw();
  });
  const maxInput = numberInput({ value: group.max, min: 0 });
  maxInput.addEventListener('input', () => (group.max = Number(maxInput.value) || 0));

  const limits =
    group.type === 'multiple'
      ? h('div', { class: 'grid-2' }, field('Mínimo', minInput), field('Máximo', maxInput, { hint: '0 = sem limite.' }))
      : null;

  const optionRows = group.options.map((option, optionIndex) => {
    const optionName = textInput({ value: option.name, maxlength: 80, placeholder: 'Nome da opção', 'aria-label': 'Nome da opção' });
    optionName.addEventListener('input', () => (option.name = optionName.value));
    const price = moneyInput({ value: option.price, 'aria-label': 'Preço adicional' });
    price.addEventListener('input', () => (option.price = readMoney(price)));
    const active = toggle({ checked: option.active, label: 'Ativa', onChange: (value) => (option.active = value) });
    return h(
      'li',
      { class: 'option-row' },
      optionName,
      h('div', { class: 'option-row__side' }, h('span', { class: 'option-row__prefix' }, '+ R$'), price),
      active.el,
      iconButton('trash', 'Remover opção', () => {
        group.options.splice(optionIndex, 1);
        redraw();
      }, { danger: true }),
    );
  });

  const bulk = textArea({ rows: 4, placeholder: 'Uma opção por linha. Para cobrar a mais, use ponto e vírgula:\nBanana\nNutella; 4,00\nOreo; 3,00' });
  const bulkBox = h(
    'div',
    { class: 'bulk', hidden: true },
    bulk,
    btn('Adicionar à lista', {
      variant: 'primary',
      onClick: () => {
        const parsed = parseOptionLines(bulk.value);
        if (!parsed.length) return toast('Digite ao menos uma opção.', { type: 'error' });
        group.options.push(...parsed);
        return redraw();
      },
    }),
  );

  return h(
    'li',
    { class: 'group-editor' },
    h(
      'div',
      { class: 'group-editor__head' },
      name,
      iconButton('arrow-up', 'Subir grupo', () => onMove(-1), { disabled: index === 0 }),
      iconButton('arrow-down', 'Descer grupo', () => onMove(1), { disabled: index === total - 1 }),
      iconButton('trash', 'Remover grupo', onRemove, { danger: true }),
    ),
    h('div', { class: 'group-editor__rules' }, type, required.el),
    limits,
    optionRows.length ? h('ul', { class: 'option-list' }, optionRows) : h('p', { class: 'muted' }, 'Nenhuma opção ainda.'),
    h(
      'div',
      { class: 'actions' },
      btn('Adicionar opção', {
        iconName: 'plus',
        onClick: () => {
          group.options.push({ id: uid('opt'), name: '', price: 0, active: true });
          redraw();
        },
      }),
      btn('Colar lista', { iconName: 'list', onClick: () => (bulkBox.hidden = !bulkBox.hidden) }),
    ),
    bulkBox,
  );
}

/**
 * Janela para criar ou editar um produto.
 * @param {{ ctx, product: object|null, categoryId?: string, onSaved: () => void }} params
 */
export function openProductEditor({ ctx, product, categoryId, onSaved }) {
  const isNew = !product;
  const draft = structuredClone(
    product ?? {
      id: uid('prod'),
      categoryId: categoryId || ctx.store.categories[0]?.id || '',
      name: '',
      description: '',
      image: '',
      price: 0,
      promoPrice: null,
      active: true,
      featured: false,
      soldOut: false,
      optionGroups: [],
    },
  );

  const image = imageField({ ctx, label: 'Foto', value: draft.image, maxSize: CONFIG.image.product });
  const name = textInput({ value: draft.name, maxlength: 120, placeholder: 'Ex.: Açaí 500 ml' });
  const category = selectInput({ value: draft.categoryId, options: ctx.store.categories.map((c) => ({ value: c.id, label: c.name })) });
  const description = textArea({ value: draft.description, rows: 3, maxlength: 600, placeholder: 'O que vem no produto, tamanho, ingredientes.' });
  const price = moneyInput({ value: draft.price });
  const promo = moneyInput({ value: draft.promoPrice ?? 0, blank: true, placeholder: 'Sem promoção' });
  const featured = toggle({ checked: draft.featured, label: 'Mais vendido', hint: 'Aparece no topo do cardápio.' });
  const soldOut = toggle({ checked: draft.soldOut, label: 'Esgotado', hint: 'Continua visível, mas o cliente não consegue pedir.' });
  const active = toggle({ checked: draft.active, label: 'Visível no cardápio' });

  const groupsList = h('ul', { class: 'group-list' });
  const redraw = () => {
    groupsList.replaceChildren(
      ...draft.optionGroups.map((group, index) =>
        groupEditor(group, {
          index,
          total: draft.optionGroups.length,
          redraw,
          onMove: (step) => {
            const target = index + step;
            [draft.optionGroups[index], draft.optionGroups[target]] = [draft.optionGroups[target], draft.optionGroups[index]];
            redraw();
          },
          onRemove: () => {
            draft.optionGroups.splice(index, 1);
            redraw();
          },
        }),
      ),
    );
  };
  redraw();

  const form = h(
    'form',
    {
      class: 'stack',
      novalidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        const title = name.value.trim();
        if (title.length < 2) return toast('Informe o nome do produto.', { type: 'error' });
        if (!category.value) return toast('Escolha uma categoria.', { type: 'error' });
        const emptyGroup = draft.optionGroups.find((group) => !group.options.some((option) => option.name.trim()));
        if (emptyGroup) return toast(`Adicione opções em "${emptyGroup.name || 'Opções'}" ou remova o grupo.`, { type: 'error' });

        const basePrice = readMoney(price);
        const promoValue = promo.value.trim() ? readMoney(promo) : null;
        if (promoValue !== null && promoValue >= basePrice) return toast('O preço promocional precisa ser menor que o preço normal.', { type: 'error' });

        const next = {
          ...draft,
          name: title,
          categoryId: category.value,
          description: description.value,
          image: image.get(),
          price: basePrice,
          promoPrice: promoValue,
          featured: featured.input.checked,
          soldOut: soldOut.input.checked,
          active: active.input.checked,
        };

        const saved = await ctx.commit(
          (store) => {
            const index = store.products.findIndex((item) => item.id === next.id);
            if (index >= 0) store.products[index] = next;
            else store.products.push(next);
          },
          { message: isNew ? 'Produto criado.' : 'Produto salvo.' },
        );
        if (saved) {
          sheet.close();
          onSaved();
        }
      },
    },
    image.el,
    field('Nome', name),
    field('Categoria', category),
    field('Descrição', description),
    h('div', { class: 'grid-2' }, field('Preço (R$)', price, { hint: 'Deixe 0 se o preço vem das opções (ex.: tamanho).' }), field('Preço promocional (R$)', promo, { hint: 'Opcional. Aparece em Promoções.' })),
    h('div', { class: 'stack-tight' }, featured.el, soldOut.el, active.el),
    h(
      'section',
      { class: 'panel panel--inset' },
      h('h3', { class: 'panel__title' }, 'Opções do produto'),
      h('p', { class: 'muted' }, 'Tamanho, sabores, complementos e adicionais. O cliente escolhe antes de adicionar ao carrinho.'),
      groupsList,
      h(
        'div',
        { class: 'actions' },
        btn('Adicionar grupo de opções', {
          iconName: 'plus',
          onClick: () => {
            draft.optionGroups.push({ id: uid('grp'), name: 'Nova escolha', type: 'single', required: false, min: 0, max: 1, options: [] });
            redraw();
          },
        }),
      ),
    ),
  );

  const sheet = openSheet({ title: isNew ? 'Novo produto' : 'Editar produto', body: form, className: 'sheet--editor' });
  sheet.setFooter(
    h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => sheet.close() }, 'Cancelar'),
    h('button', { type: 'button', class: 'btn btn--primary btn--grow', onClick: () => form.requestSubmit() }, isNew ? 'Criar produto' : 'Salvar produto'),
  );
  return sheet;
}
