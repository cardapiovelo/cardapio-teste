import { h } from '../core/dom.js';
import { icon } from './icons.js';

let openCount = 0;

/**
 * Abre uma "sheet": gaveta no celular, janela centralizada no desktop.
 * Usa <dialog>, então Esc, foco e camada superior já funcionam sozinhos.
 */
export function openSheet({ title = '', body, footer = null, className = '', onClose, dismissible = true } = {}) {
  const closeButton = h(
    'button',
    { type: 'button', class: 'icon-btn sheet__close', 'aria-label': 'Fechar', onClick: () => dialog.close() },
    icon('close'),
  );
  const titleEl = h('h2', { class: 'sheet__title' }, title);
  const top = title
    ? h('header', { class: 'sheet__header' }, titleEl, dismissible ? closeButton : null)
    : dismissible
      ? closeButton
      : null;
  const bodyEl = h('div', { class: 'sheet__body' }, body);
  const footerEl = h('footer', { class: 'sheet__footer', hidden: !footer }, footer);
  const panel = h('div', { class: 'sheet__panel' }, top, bodyEl, footerEl);
  const dialog = h('dialog', { class: ['sheet', className], 'aria-label': title || undefined }, panel);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && dismissible) dialog.close();
  });
  dialog.addEventListener('cancel', (event) => {
    if (!dismissible) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.documentElement.classList.remove('has-sheet');
    onClose?.();
  });

  document.body.append(dialog);
  dialog.showModal();
  openCount += 1;
  document.documentElement.classList.add('has-sheet');

  return {
    el: dialog,
    body: bodyEl,
    footer: footerEl,
    close: () => dialog.close(),
    setTitle: (value) => {
      titleEl.textContent = value;
    },
    setFooter: (...nodes) => {
      footerEl.replaceChildren(...nodes.filter(Boolean));
      footerEl.hidden = nodes.filter(Boolean).length === 0;
    },
  };
}

/** Pergunta de confirmação. Resolve true/false. */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const sheet = openSheet({
      title,
      className: 'sheet--small',
      body: h('p', { class: 'sheet__message' }, message),
      onClose: () => resolve(answer),
    });
    sheet.setFooter(
      h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => sheet.close() }, 'Cancelar'),
      h(
        'button',
        {
          type: 'button',
          class: ['btn', danger ? 'btn--danger' : 'btn--primary'],
          onClick: () => {
            answer = true;
            sheet.close();
          },
        },
        confirmLabel,
      ),
    );
  });
}
