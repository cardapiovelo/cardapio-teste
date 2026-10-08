/** Peças de formulário usadas pelas telas do painel. */
import { h } from '../../core/dom.js';
import { formatMoneyInput, parseMoney } from '../../core/utils.js';
import { icon } from '../../ui/icons.js';

export function field(label, control, { hint } = {}) {
  return h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), control, hint && h('small', { class: 'field__hint' }, hint));
}

export const textInput = ({ value = '', ...rest } = {}) => h('input', { class: 'input', type: 'text', value, ...rest });

export const textArea = ({ value = '', rows = 3, ...rest } = {}) => h('textarea', { class: 'input input--area', rows, value, ...rest });

export const moneyInput = ({ value = 0, blank = false, ...rest } = {}) =>
  h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: blank && !value ? '' : formatMoneyInput(value), ...rest });

export const readMoney = (input) => parseMoney(input.value);

export const numberInput = ({ value = 0, min = 0, step = 1, ...rest } = {}) =>
  h('input', { class: 'input', type: 'number', inputmode: 'numeric', min, step, value, ...rest });

export function selectInput({ value, options, ...rest }) {
  const el = h('select', { class: 'input', ...rest }, options.map((option) => h('option', { value: option.value }, option.label)));
  el.value = value;
  return el;
}

/** Interruptor liga/desliga. Devolve { el, input }. */
export function toggle({ checked = false, label, hint = '', onChange } = {}) {
  const input = h('input', { type: 'checkbox', class: 'toggle__input', checked });
  if (onChange) input.addEventListener('change', () => onChange(input.checked));
  const el = h(
    'label',
    { class: 'toggle' },
    input,
    h('span', { class: 'toggle__track', 'aria-hidden': 'true' }),
    h('span', { class: 'toggle__text' }, label, hint && h('small', {}, hint)),
  );
  return { el, input };
}

export function btn(label, { variant = 'soft', iconName, size = 'small', type = 'button', onClick, disabled = false, ...rest } = {}) {
  return h(
    'button',
    { type, class: ['btn', `btn--${variant}`, size && `btn--${size}`], onClick, disabled, ...rest },
    iconName && icon(iconName, { size: 16 }),
    label,
  );
}

export function iconButton(iconName, label, onClick, { danger = false, disabled = false } = {}) {
  return h(
    'button',
    { type: 'button', class: ['icon-btn', danger && 'icon-btn--danger'], 'aria-label': label, title: label, onClick, disabled },
    icon(iconName, { size: 18 }),
  );
}

export const panel = (title, ...children) =>
  h('section', { class: 'panel' }, title && h('h2', { class: 'panel__title' }, title), ...children);

export const pageHeader = (title, description, ...actions) =>
  h(
    'div',
    { class: 'page-head' },
    h('div', {}, h('h1', { class: 'page-head__title' }, title), description && h('p', { class: 'page-head__text' }, description)),
    actions.length > 0 && h('div', { class: 'page-head__actions' }, ...actions),
  );

/** Desabilita o botão enquanto uma ação assíncrona roda. */
export async function withBusy(button, task) {
  button.disabled = true;
  try {
    return await task();
  } finally {
    button.disabled = false;
  }
}
