import { h } from '../core/dom.js';
import { icon } from './icons.js';

/** Controle de quantidade: [-] 2 [+]. */
export function stepper({ value = 1, min = 0, max = 99, label = 'Quantidade', onChange }) {
  let current = value;
  const output = h('output', { class: 'stepper__value', 'aria-live': 'polite' }, String(current));
  const minus = h('button', { type: 'button', class: 'stepper__btn', 'aria-label': `Diminuir ${label.toLowerCase()}` }, icon('minus', { size: 16 }));
  const plus = h('button', { type: 'button', class: 'stepper__btn', 'aria-label': `Aumentar ${label.toLowerCase()}` }, icon('plus', { size: 16 }));

  const sync = () => {
    output.textContent = String(current);
    minus.disabled = current <= min;
    plus.disabled = current >= max;
  };
  const set = (next) => {
    current = Math.min(max, Math.max(min, next));
    sync();
    onChange?.(current);
  };

  minus.addEventListener('click', () => set(current - 1));
  plus.addEventListener('click', () => set(current + 1));
  sync();

  const el = h('div', { class: 'stepper', role: 'group', 'aria-label': label }, minus, output, plus);
  return { el, get value() { return current; }, set };
}
