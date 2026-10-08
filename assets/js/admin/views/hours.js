import { h } from '../../core/dom.js';
import { DAYS, TIME_ZONES } from '../../domain/schema.js';
import { getStoreStatus } from '../../domain/status.js';
import { toast } from '../../ui/toast.js';
import { btn, field, pageHeader, panel, selectInput, toggle, withBusy } from '../ui/form.js';

export const id = 'horarios';
export const label = 'Horários';
export const iconName = 'clock';

const STATUS_OPTIONS = [
  { value: 'auto', label: 'Seguir os horários abaixo' },
  { value: 'open', label: 'Forçar aberto agora' },
  { value: 'closed', label: 'Forçar fechado agora' },
];

export function render(container, ctx) {
  const { hours, settings } = ctx.store;

  const rows = hours.map((entry) => {
    const open = toggle({ checked: entry.open, label: DAYS[entry.day] });
    const from = h('input', { class: 'input', type: 'time', value: entry.from, 'aria-label': `${DAYS[entry.day]}: abre às` });
    const to = h('input', { class: 'input', type: 'time', value: entry.to, 'aria-label': `${DAYS[entry.day]}: fecha às` });
    const sync = () => {
      from.disabled = !open.input.checked;
      to.disabled = !open.input.checked;
    };
    open.input.addEventListener('change', sync);
    sync();
    return { open, from, to, el: h('li', { class: 'hours-row' }, open.el, h('div', { class: 'hours-row__times' }, from, h('span', {}, 'às'), to)) };
  });

  const copyMonday = btn('Copiar o horário de segunda para os outros dias', {
    iconName: 'copy',
    onClick: () => {
      const monday = rows[1];
      rows.forEach((row, index) => {
        if (index === 1) return;
        row.open.input.checked = monday.open.input.checked;
        row.from.value = monday.from.value;
        row.to.value = monday.to.value;
        row.from.disabled = row.to.disabled = !monday.open.input.checked;
      });
    },
  });

  const forceStatus = selectInput({ value: settings.forceStatus, options: STATUS_OPTIONS });
  const timeZone = selectInput({ value: settings.timeZone, options: TIME_ZONES });
  const allowClosed = toggle({
    checked: settings.allowOrdersWhenClosed,
    label: 'Aceitar pedidos mesmo com a loja fechada',
    hint: 'O cliente consegue enviar o pedido, e você responde quando abrir.',
  });

  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Salvar horários');

  const form = h(
    'form',
    {
      class: 'stack',
      onSubmit: (event) => {
        event.preventDefault();
        if (rows.some((row) => row.open.input.checked && (!row.from.value || !row.to.value))) {
          return toast('Preencha o horário de abertura e de fechamento.', { type: 'error' });
        }
        return withBusy(submit, () =>
          ctx.commit(
            (draft) => {
              draft.hours = rows.map((row, day) => ({ day, open: row.open.input.checked, from: row.from.value, to: row.to.value }));
              draft.settings.forceStatus = forceStatus.value;
              draft.settings.timeZone = timeZone.value;
              draft.settings.allowOrdersWhenClosed = allowClosed.input.checked;
            },
            { message: 'Horários salvos.' },
          ),
        );
      },
    },
    panel('Horário de funcionamento', h('ul', { class: 'hours-list' }, rows.map((row) => row.el)), h('div', { class: 'actions' }, copyMonday)),
    panel(
      'Abrir e fechar',
      field('Situação da loja', forceStatus, { hint: `Agora: ${getStoreStatus(ctx.store).label}.` }),
      field('Fuso horário', timeZone),
      allowClosed.el,
    ),
    h('div', { class: 'actions actions--sticky' }, submit),
  );

  container.replaceChildren(pageHeader('Horários', 'Quando a loja aparece como aberta para os clientes.'), form);
}
