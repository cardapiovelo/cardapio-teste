import { h } from '../core/dom.js';
import { icon } from './icons.js';

/** Tela vazia que diz o que fazer em seguida. */
export function emptyState({ iconName = 'bowl', title, text = '', action = null }) {
  return h(
    'div',
    { class: 'empty-state' },
    h('span', { class: 'empty-state__icon' }, icon(iconName, { size: 32 })),
    h('h3', { class: 'empty-state__title' }, title),
    text && h('p', { class: 'empty-state__text' }, text),
    action,
  );
}
