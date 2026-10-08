import { h } from '../../core/dom.js';
import { formatBRL, safeUrl } from '../../core/utils.js';
import {
  buildCartItem,
  effectivePrice,
  groupBounds,
  hasPromo,
  hasVariablePrice,
  selectionTotal,
  startingPrice,
  validateSelection,
} from '../../domain/pricing.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/modal.js';
import { stepper } from '../../ui/stepper.js';
import { toast } from '../../ui/toast.js';

function ruleText(group) {
  const { min, max } = groupBounds(group);
  if (group.type === 'single') return min ? 'Escolha 1' : 'Escolha até 1';
  if (min && min === max) return `Escolha ${min}`;
  if (min) return `Escolha de ${min} a ${max}`;
  return `Escolha até ${max}`;
}

/** Um grupo de opções (tamanho, sabores, adicionais...). */
function buildGroup(group, chosen, onChange) {
  const { max } = groupBounds(group);
  const single = group.type === 'single';
  const counter = h('span', { class: 'group__counter' });
  const error = h('p', { class: 'group__error', role: 'alert', hidden: true });

  const rows = group.options
    .filter((option) => option.active)
    .map((option) => {
      const input = h('input', {
        type: single ? 'radio' : 'checkbox',
        name: `group-${group.id}`,
        value: option.id,
        class: 'choice__input',
      });
      input.addEventListener('click', () => {
        // Grupo de escolha única e opcional: segundo clique desmarca.
        if (single && !group.required) {
          if (input.dataset.was === 'true') {
            input.checked = false;
            chosen.clear();
            rows.forEach((row) => (row.input.dataset.was = 'false'));
            onChange();
            return;
          }
          rows.forEach((row) => (row.input.dataset.was = String(row.input === input)));
        }
      });
      input.addEventListener('change', () => {
        if (single) {
          chosen.clear();
          if (input.checked) chosen.add(option.id);
        } else if (input.checked) chosen.add(option.id);
        else chosen.delete(option.id);
        onChange();
      });
      const label = h(
        'label',
        { class: 'choice' },
        input,
        h('span', { class: ['choice__mark', single && 'choice__mark--round'], 'aria-hidden': 'true' }, icon('check', { size: 14 })),
        h('span', { class: 'choice__name' }, option.name),
        option.price > 0 && h('span', { class: 'choice__price' }, `+ ${formatBRL(option.price)}`),
      );
      return { input, option, label };
    });

  const sync = () => {
    const reached = !single && chosen.size >= max;
    for (const row of rows) row.input.disabled = reached && !row.input.checked;
    counter.textContent = single ? '' : `${chosen.size}/${max}`;
    error.hidden = true;
  };

  const el = h(
    'div',
    { class: 'group', role: 'group', 'aria-labelledby': `group-${group.id}-name`, dataset: { group: group.id } },
    h(
      'div',
      { class: 'group__head' },
      h('span', { class: 'group__name', id: `group-${group.id}-name` }, group.name),
      h('span', { class: ['group__tag', group.required && 'is-required'] }, group.required ? 'Obrigatório' : 'Opcional'),
    ),
    h('p', { class: 'group__rule' }, ruleText(group), counter),
    h('div', { class: 'group__options' }, rows.map((row) => row.label)),
    error,
  );

  return {
    el,
    sync,
    showError(message) {
      error.textContent = message;
      error.hidden = false;
    },
  };
}

/**
 * Janela do produto: opções, quantidade, observação e botão "Adicionar".
 * @param {{ product: object, onAdd: (item: object) => void }} params
 */
export function openProductSheet({ product, onAdd }) {
  const chosen = Object.fromEntries(product.optionGroups.map((group) => [group.id, new Set()]));
  const state = { qty: 1, note: '' };
  const src = safeUrl(product.image);

  const addButton = h('button', { type: 'button', class: 'btn btn--primary btn--grow' });
  const qty = stepper({ value: 1, min: 1, max: 20, label: 'Quantidade', onChange: (value) => { state.qty = value; refresh(); } });

  const groups = product.optionGroups
    .filter((group) => group.options.some((option) => option.active))
    .map((group) => ({ group, view: buildGroup(group, chosen[group.id], () => refresh()) }));

  const noteInput = h('textarea', {
    class: 'input input--area',
    rows: 2,
    maxlength: 140,
    placeholder: 'Ex.: sem granola, pouco gelo',
    'aria-label': 'Observação do item',
  });
  noteInput.addEventListener('input', () => {
    state.note = noteInput.value;
  });

  const startsAt = hasVariablePrice(product) ? `A partir de ${formatBRL(startingPrice(product))}` : formatBRL(effectivePrice(product));

  const body = h(
    'div',
    { class: 'product-sheet' },
    src ? h('img', { class: 'product-sheet__img', src, alt: product.name }) : null,
    h(
      'div',
      { class: 'product-sheet__intro' },
      h('h2', { class: 'product-sheet__name' }, product.name),
      product.description && h('p', { class: 'product-sheet__desc' }, product.description),
      (effectivePrice(product) > 0 || hasVariablePrice(product)) &&
        h(
          'p',
          { class: 'product-sheet__price' },
          h('strong', {}, startsAt),
          hasPromo(product) && !hasVariablePrice(product) && h('s', {}, formatBRL(product.price)),
        ),
    ),
    groups.map((entry) => entry.view.el),
    h('label', { class: 'field product-sheet__note' }, h('span', { class: 'field__label' }, 'Observações'), noteInput),
  );

  const sheet = openSheet({ body, className: src ? 'sheet--cover' : '', title: '' });

  function currentSelection() {
    return Object.fromEntries(Object.entries(chosen).map(([id, set]) => [id, [...set]]));
  }

  function refresh() {
    groups.forEach((entry) => entry.view.sync());
    const total = (effectivePrice(product) + selectionTotal(product, currentSelection())) * state.qty;
    addButton.replaceChildren(h('span', {}, 'Adicionar'), h('strong', {}, formatBRL(total)));
  }

  addButton.addEventListener('click', () => {
    const selection = currentSelection();
    const { valid, errors } = validateSelection(product, selection);
    if (!valid) {
      let first = null;
      for (const { group, view } of groups) {
        if (errors[group.id]) {
          view.showError(errors[group.id]);
          first ??= view.el;
        }
      }
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Faltam algumas escolhas.', { type: 'error' });
      return;
    }
    onAdd(buildCartItem(product, selection, { qty: state.qty, note: state.note }));
    sheet.close();
  });

  sheet.setFooter(qty.el, addButton);
  refresh();
  return sheet;
}
