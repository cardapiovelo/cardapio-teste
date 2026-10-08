import { copyText } from '../../core/clipboard.js';
import { h } from '../../core/dom.js';
import { formatBRL } from '../../core/utils.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

async function copyPix(text) {
  if (await copyText(text)) toast('Chave Pix copiada.', { type: 'success' });
  else toast('Não deu para copiar. Selecione e copie a chave.', { type: 'error' });
}

/** Depois do envio: lembra de confirmar no WhatsApp e mostra a chave Pix, se houver. */
export function openSuccessSheet({ order, url }) {
  const pixKey = order.payment.type === 'pix' ? order.payment.pixKey : '';

  const body = h(
    'div',
    { class: 'success' },
    h('span', { class: 'success__icon' }, icon('check', { size: 32 })),
    h('h3', { class: 'success__title' }, `Pedido ${order.code} pronto`),
    h('p', { class: 'success__text' }, 'Falta uma etapa: envie a mensagem na conversa do WhatsApp para a loja receber o pedido.'),
    h(
      'a',
      { class: 'btn btn--primary btn--block', href: url, target: '_blank', rel: 'noopener noreferrer' },
      icon('whatsapp', { size: 20 }),
      'Abrir o WhatsApp',
    ),
    pixKey &&
      h(
        'div',
        { class: 'pix-box' },
        h('p', {}, `Para pagar ${formatBRL(order.totals.total)} no Pix, use a chave:`),
        h('code', { class: 'pix-box__key' }, pixKey),
        h('button', { type: 'button', class: 'btn btn--soft btn--small', onClick: () => copyPix(pixKey) }, icon('copy', { size: 16 }), 'Copiar chave'),
      ),
  );

  return openSheet({ title: '', body, className: 'sheet--small' });
}
