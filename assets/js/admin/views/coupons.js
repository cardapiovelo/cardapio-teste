import { h } from '../../core/dom.js';
import { formatBRL, uid } from '../../core/utils.js';
import { emptyState } from '../../ui/empty-state.js';
import { confirmDialog, openSheet } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { btn, field, iconButton, moneyInput, pageHeader, panel, readMoney, selectInput, textInput, toggle } from '../ui/form.js';

export const id = 'cupons';
export const label = 'Cupons';
export const iconName = 'tag';

const describe = (coupon) => {
  const value = coupon.type === 'percent' ? `${coupon.value}% de desconto` : `${formatBRL(coupon.value)} de desconto`;
  return coupon.minOrder > 0 ? `${value} em pedidos a partir de ${formatBRL(coupon.minOrder)}` : value;
};

function openCouponEditor(ctx, coupon) {
  const isNew = !coupon;
  const code = textInput({ value: coupon?.code ?? '', maxlength: 20, placeholder: 'Ex.: BEMVINDO10', autocapitalize: 'characters' });
  const type = selectInput({
    value: coupon?.type ?? 'percent',
    options: [
      { value: 'percent', label: 'Porcentagem (%)' },
      { value: 'fixed', label: 'Valor fixo (R$)' },
    ],
  });
  const value = moneyInput({ value: coupon?.value ?? 10 });
  const minOrder = moneyInput({ value: coupon?.minOrder ?? 0 });
  const active = toggle({ checked: coupon?.active ?? true, label: 'Cupom ativo' });

  const form = h(
    'form',
    {
      novalidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        const normalized = code.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (normalized.length < 3) return toast('O código precisa ter ao menos 3 letras ou números.', { type: 'error' });
        if (ctx.store.coupons.some((item) => item.code === normalized && item.id !== coupon?.id)) {
          return toast('Já existe um cupom com esse código.', { type: 'error' });
        }
        if (readMoney(value) <= 0) return toast('Informe o valor do desconto.', { type: 'error' });

        const next = {
          id: coupon?.id ?? uid('cup'),
          code: normalized,
          type: type.value,
          value: readMoney(value),
          minOrder: readMoney(minOrder),
          active: active.input.checked,
        };
        const saved = await ctx.commit(
          (draft) => {
            const index = draft.coupons.findIndex((item) => item.id === next.id);
            if (index >= 0) draft.coupons[index] = next;
            else draft.coupons.push(next);
          },
          { message: isNew ? 'Cupom criado.' : 'Cupom salvo.' },
        );
        if (saved) {
          sheet.close();
          ctx.refresh();
        }
      },
    },
    field('Código', code),
    h('div', { class: 'grid-2' }, field('Tipo', type), field('Valor', value, { hint: 'Em % ou em reais, conforme o tipo.' })),
    field('Pedido mínimo (R$)', minOrder, { hint: '0 para valer em qualquer pedido.' }),
    active.el,
  );

  const sheet = openSheet({ title: isNew ? 'Novo cupom' : 'Editar cupom', body: form, className: 'sheet--small' });
  sheet.setFooter(h('button', { type: 'button', class: 'btn btn--primary btn--block', onClick: () => form.requestSubmit() }, isNew ? 'Criar cupom' : 'Salvar cupom'));
}

export function render(container, ctx) {
  const { coupons } = ctx.store;

  const rows = coupons.map((coupon, index) =>
    h(
      'li',
      { class: 'item-card' },
      h('div', { class: 'item-card__head' }, h('strong', { class: 'code' }, coupon.code), h('span', { class: 'muted' }, describe(coupon))),
      h(
        'div',
        { class: 'item-card__foot' },
        toggle({
          checked: coupon.active,
          label: 'Ativo',
          onChange: async (checked) => {
            if (await ctx.commit((draft) => (draft.coupons[index].active = checked), { message: checked ? 'Cupom ativado.' : 'Cupom desativado.' })) ctx.refresh();
          },
        }).el,
        h(
          'div',
          { class: 'item-card__tools' },
          iconButton('edit', 'Editar cupom', () => openCouponEditor(ctx, coupon)),
          iconButton(
            'trash',
            'Excluir cupom',
            async () => {
              const ok = await confirmDialog({ title: `Excluir ${coupon.code}?`, message: 'Clientes não poderão mais usar esse código.', confirmLabel: 'Excluir', danger: true });
              if (ok && (await ctx.commit((draft) => (draft.coupons = draft.coupons.filter((item) => item.id !== coupon.id)), { message: 'Cupom excluído.' }))) ctx.refresh();
            },
            { danger: true },
          ),
        ),
      ),
    ),
  );

  container.replaceChildren(
    pageHeader('Cupons', 'Códigos de desconto que o cliente digita ao finalizar o pedido.', btn('Novo cupom', { variant: 'primary', iconName: 'plus', onClick: () => openCouponEditor(ctx, null) })),
    coupons.length
      ? panel('', h('ul', { class: 'stack-list' }, rows))
      : emptyState({ iconName: 'tag', title: 'Nenhum cupom criado', text: 'Crie um código como BEMVINDO10 para atrair o primeiro pedido.' }),
  );
}
