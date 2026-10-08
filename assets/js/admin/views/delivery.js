import { h } from '../../core/dom.js';
import { uid } from '../../core/utils.js';
import { toast } from '../../ui/toast.js';
import { btn, field, iconButton, moneyInput, numberInput, pageHeader, panel, readMoney, textInput, toggle, withBusy } from '../ui/form.js';

export const id = 'entrega';
export const label = 'Entrega e pagamento';
export const iconName = 'wallet';

export function render(container, ctx) {
  const { settings } = ctx.store;
  const payments = structuredClone(ctx.store.payments);

  const delivery = toggle({ checked: settings.deliveryEnabled, label: 'Fazer entregas' });
  const pickup = toggle({ checked: settings.pickupEnabled, label: 'Aceitar retirada no local' });
  const fee = moneyInput({ value: settings.deliveryFee });
  const freeAbove = moneyInput({ value: settings.freeDeliveryAbove });
  const minOrder = moneyInput({ value: settings.minOrder });
  const deliveryTime = numberInput({ value: settings.deliveryTimeMin, min: 0, step: 5 });
  const pickupTime = numberInput({ value: settings.pickupTimeMin, min: 0, step: 5 });

  /* ---------- formas de pagamento ---------- */
  const list = h('ul', { class: 'stack-list' });

  function drawPayments() {
    list.replaceChildren(
      ...payments.map((payment, index) => {
        const enabled = toggle({ checked: payment.enabled, label: 'Disponível', onChange: (value) => (payment.enabled = value) });
        const name = textInput({ value: payment.label, maxlength: 40, 'aria-label': 'Nome da forma de pagamento' });
        name.addEventListener('input', () => (payment.label = name.value));
        const note = textInput({ value: payment.note, maxlength: 140, placeholder: 'Aviso para o cliente (opcional)', 'aria-label': 'Aviso' });
        note.addEventListener('input', () => (payment.note = note.value));

        const extras = [];
        if (payment.type === 'cash') {
          extras.push(toggle({ checked: payment.askChange, label: 'Perguntar se precisa de troco', onChange: (value) => (payment.askChange = value) }).el);
        }
        if (payment.type === 'pix') {
          const key = textInput({ value: payment.pixKey, maxlength: 140, placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' });
          key.addEventListener('input', () => (payment.pixKey = key.value));
          extras.push(field('Chave Pix', key, { hint: 'Aparece para o cliente depois do pedido, com botão de copiar.' }));
        }

        return h(
          'li',
          { class: 'item-card' },
          h('div', { class: 'item-card__head' }, name, payment.type === 'other' ? iconButton('trash', 'Remover forma de pagamento', () => { payments.splice(index, 1); drawPayments(); }, { danger: true }) : null),
          note,
          h('div', { class: 'item-card__foot' }, enabled.el, ...extras),
        );
      }),
    );
  }
  drawPayments();

  const addPayment = btn('Adicionar forma de pagamento', {
    iconName: 'plus',
    onClick: () => {
      payments.push({ id: uid('pay'), type: 'other', label: 'Nova forma de pagamento', enabled: true, note: '' });
      drawPayments();
    },
  });

  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Salvar');

  const form = h(
    'form',
    {
      class: 'stack',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        if (!delivery.input.checked && !pickup.input.checked) return toast('Deixe ao menos entrega ou retirada ligada.', { type: 'error' });
        if (!payments.some((payment) => payment.enabled)) return toast('Deixe ao menos uma forma de pagamento disponível.', { type: 'error' });
        return withBusy(submit, () =>
          ctx.commit(
            (draft) => {
              Object.assign(draft.settings, {
                deliveryEnabled: delivery.input.checked,
                pickupEnabled: pickup.input.checked,
                deliveryFee: readMoney(fee),
                freeDeliveryAbove: readMoney(freeAbove),
                minOrder: readMoney(minOrder),
                deliveryTimeMin: Number(deliveryTime.value) || 0,
                pickupTimeMin: Number(pickupTime.value) || 0,
              });
              draft.payments = payments;
            },
            { message: 'Configurações salvas.' },
          ),
        );
      },
    },
    panel(
      'Entrega e retirada',
      delivery.el,
      pickup.el,
      h('div', { class: 'grid-2' }, field('Taxa de entrega (R$)', fee), field('Entrega grátis acima de (R$)', freeAbove, { hint: '0 desliga.' })),
      h('div', { class: 'grid-2' }, field('Tempo de entrega (min)', deliveryTime), field('Tempo de retirada (min)', pickupTime)),
      field('Pedido mínimo (R$)', minOrder, { hint: '0 para não ter mínimo.' }),
    ),
    panel('Formas de pagamento', list, h('div', { class: 'actions' }, addPayment)),
    h('div', { class: 'actions actions--sticky' }, submit),
  );

  container.replaceChildren(pageHeader('Entrega e pagamento', 'Taxas, prazos, pedido mínimo e como o cliente paga.'), form);
}
