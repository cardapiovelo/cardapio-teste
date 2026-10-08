import { h } from '../../core/dom.js';
import { formatBRL, formatDuration, maskPhoneInput, normalizePhoneBR, onlyDigits, parseMoney, uid } from '../../core/utils.js';
import { checkCoupon, computeTotals } from '../../domain/pricing.js';
import { getStoreStatus } from '../../domain/status.js';
import { buildOrderMessage, buildWhatsAppUrl, createOrderCode } from '../../domain/whatsapp.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/modal.js';
import { loadCustomer, saveCustomer, saveOrder } from '../orders.js';

const MODE_LABEL = { delivery: 'Entrega', pickup: 'Retirada' };

function input(props) {
  return h('input', { class: 'input', ...props });
}

/**
 * Finalizar pedido: dados, entrega/retirada, pagamento, cupom e envio por WhatsApp.
 * @param {{ store, slug: string, cart, onSent: (order: object, url: string) => void }} params
 */
export function openCheckoutSheet({ store, slug, cart, onSent }) {
  const { settings, profile } = store;
  const modes = [settings.deliveryEnabled && 'delivery', settings.pickupEnabled && 'pickup'].filter(Boolean);
  const payments = store.payments.filter((payment) => payment.enabled);
  const saved = loadCustomer(slug);

  if (!modes.length || !payments.length) {
    return openSheet({
      title: 'Pedidos indisponíveis',
      body: h('p', { class: 'sheet__message' }, 'Esta loja ainda não configurou entrega, retirada ou formas de pagamento.'),
    });
  }

  const state = {
    mode: modes.includes(saved.mode) ? saved.mode : modes[0],
    paymentId: payments.some((p) => p.id === saved.paymentId) ? saved.paymentId : payments[0].id,
    coupon: null,
  };

  /* ---------- campos ---------- */
  const fields = {};
  function field(name, label, control, hint) {
    const error = h('small', { class: 'field__error', role: 'alert' });
    const wrapper = h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), control, hint && h('small', { class: 'field__hint' }, hint), error);
    fields[name] = {
      control,
      wrapper,
      setError(message) {
        error.textContent = message ?? '';
        wrapper.classList.toggle('has-error', Boolean(message));
      },
    };
    return wrapper;
  }

  const address = saved.address ?? {};
  const phoneInput = input({ type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '(00) 00000-0000', value: saved.phone ?? '' });
  phoneInput.addEventListener('input', () => {
    phoneInput.value = maskPhoneInput(phoneInput.value);
  });

  const identity = h(
    'section',
    { class: 'form-block' },
    h('h3', { class: 'form-block__title' }, 'Seus dados'),
    field('name', 'Nome', input({ type: 'text', autocomplete: 'name', value: saved.name ?? '', maxlength: 60 })),
    field('phone', 'WhatsApp', phoneInput),
  );

  const addressBlock = h(
    'section',
    { class: 'form-block' },
    h('h3', { class: 'form-block__title' }, 'Endereço de entrega'),
    field('street', 'Rua ou avenida', input({ type: 'text', autocomplete: 'address-line1', value: address.street ?? '', maxlength: 120 })),
    h(
      'div',
      { class: 'form-row' },
      field('number', 'Número', input({ type: 'text', inputmode: 'numeric', value: address.number ?? '', maxlength: 12 })),
      field('complement', 'Complemento', input({ type: 'text', value: address.complement ?? '', maxlength: 60 })),
    ),
    field('district', 'Bairro', input({ type: 'text', value: address.district ?? '', maxlength: 60 })),
    field('city', 'Cidade', input({ type: 'text', value: address.city ?? profile.address.city, maxlength: 60 })),
    field('reference', 'Ponto de referência', input({ type: 'text', value: address.reference ?? '', maxlength: 100 })),
  );

  /* ---------- entrega ou retirada ---------- */
  const modeButtons = modes.map((mode) =>
    h(
      'button',
      { type: 'button', class: 'segmented__item', role: 'radio', onClick: () => setMode(mode) },
      icon(mode === 'delivery' ? 'bag' : 'store', { size: 20 }),
      h('strong', {}, MODE_LABEL[mode]),
      h('small', {}, mode === 'delivery' ? `Em ${formatDuration(settings.deliveryTimeMin)}` : `Pronto em ${formatDuration(settings.pickupTimeMin)}`),
    ),
  );
  const modeSwitch = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Como você quer receber?' }, modeButtons);

  /* ---------- pagamento ---------- */
  const changeInput = input({ type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 50,00' });
  const changeField = field('changeFor', 'Troco para quanto?', changeInput, 'Deixe em branco se não precisar de troco.');
  const paymentError = h('p', { class: 'group__error', role: 'alert', hidden: true });

  const paymentRows = payments.map((payment) => {
    const radio = h('input', { type: 'radio', name: 'payment', value: payment.id, class: 'choice__input', checked: payment.id === state.paymentId });
    radio.addEventListener('change', () => {
      state.paymentId = payment.id;
      syncPayment();
    });
    return h(
      'label',
      { class: 'choice' },
      radio,
      h('span', { class: 'choice__mark choice__mark--round', 'aria-hidden': 'true' }),
      h('span', { class: 'choice__name' }, payment.label, payment.note && h('small', {}, payment.note)),
    );
  });

  const paymentBlock = h('section', { class: 'form-block' }, h('h3', { class: 'form-block__title' }, 'Pagamento'), h('div', { class: 'group__options' }, paymentRows), changeField, paymentError);

  /* ---------- cupom, observação e resumo ---------- */
  const couponInput = input({ type: 'text', placeholder: 'Código do cupom', maxlength: 20, autocapitalize: 'characters', 'aria-label': 'Código do cupom' });
  const couponMessage = h('p', { class: 'coupon__message', role: 'status' });
  const couponButton = h('button', { type: 'button', class: 'btn btn--soft', onClick: () => applyCoupon() }, 'Aplicar');

  const noteInput = h('textarea', { class: 'input input--area', rows: 2, maxlength: 200, placeholder: 'Algo que a loja precise saber?', 'aria-label': 'Observações do pedido' });

  const summary = h('dl', { class: 'summary' });
  const notice = h('div', { class: 'notices' });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--grow' }, icon('whatsapp', { size: 20 }), 'Enviar pedido pelo WhatsApp');

  const form = h(
    'form',
    { class: 'checkout', novalidate: true },
    notice,
    h('section', { class: 'form-block' }, h('h3', { class: 'form-block__title' }, 'Como você quer receber?'), modeSwitch),
    identity,
    addressBlock,
    paymentBlock,
    h(
      'section',
      { class: 'form-block' },
      h('h3', { class: 'form-block__title' }, 'Cupom'),
      h('div', { class: 'coupon' }, couponInput, couponButton),
      couponMessage,
    ),
    h('section', { class: 'form-block' }, h('h3', { class: 'form-block__title' }, 'Observações'), noteInput),
    h('section', { class: 'form-block' }, h('h3', { class: 'form-block__title' }, 'Resumo'), summary),
  );

  const sheet = openSheet({ title: 'Finalizar pedido', body: form });
  sheet.setFooter(submit);
  submit.setAttribute('form', 'checkout-form');
  form.id = 'checkout-form';

  /* ---------- lógica ---------- */
  const currentTotals = () => computeTotals({ items: cart.items, store, mode: state.mode, coupon: state.coupon });
  const selectedPayment = () => payments.find((payment) => payment.id === state.paymentId);

  function setMode(mode) {
    state.mode = mode;
    refresh();
  }

  function syncPayment() {
    const payment = selectedPayment();
    changeField.hidden = !(payment?.type === 'cash' && payment.askChange);
    paymentError.hidden = true;
  }

  function applyCoupon() {
    const code = couponInput.value.trim();
    if (!code) {
      state.coupon = null;
      couponMessage.textContent = '';
      couponMessage.className = 'coupon__message';
      refresh();
      return;
    }
    const result = checkCoupon(store, code, cart.subtotal());
    state.coupon = result.ok ? result.coupon : null;
    couponMessage.textContent = result.ok ? `Cupom ${result.coupon.code} aplicado.` : result.message;
    couponMessage.className = `coupon__message ${result.ok ? 'is-ok' : 'is-error'}`;
    refresh();
  }

  function blockingReason() {
    if (!profile.whatsapp) return 'A loja ainda não cadastrou um WhatsApp para receber pedidos.';
    const status = getStoreStatus(store);
    if (!status.isOpen && !settings.allowOrdersWhenClosed) {
      return `A loja está fechada. ${status.detail}`.trim();
    }
    const missing = settings.minOrder - cart.subtotal();
    if (missing > 0) return `Faltam ${formatBRL(missing)} para o pedido mínimo de ${formatBRL(settings.minOrder)}.`;
    return '';
  }

  function refresh() {
    modeButtons.forEach((button, index) => {
      const active = modes[index] === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    });
    addressBlock.hidden = state.mode !== 'delivery';

    const totals = currentTotals();
    const rows = [['Subtotal', formatBRL(totals.subtotal)]];
    if (totals.discount > 0) rows.push([`Desconto (${state.coupon.code})`, `- ${formatBRL(totals.discount)}`]);
    if (state.mode === 'delivery') rows.push(['Entrega', totals.deliveryFee > 0 ? formatBRL(totals.deliveryFee) : 'Grátis']);
    summary.replaceChildren(
      ...rows.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value)]),
      h('dt', { class: 'summary__total' }, 'Total'),
      h('dd', { class: 'summary__total' }, formatBRL(totals.total)),
    );

    const reason = blockingReason();
    notice.replaceChildren(reason ? h('p', { class: 'notice notice--warn' }, reason) : null);
    submit.disabled = Boolean(reason);
    syncPayment();
  }

  function validate() {
    const errors = {};
    const required = (name, message) => {
      if (!fields[name].control.value.trim()) errors[name] = message;
    };
    if (fields.name.control.value.trim().length < 2) errors.name = 'Informe seu nome.';
    if (onlyDigits(phoneInput.value).length < 10) errors.phone = 'Informe o WhatsApp com DDD.';
    if (state.mode === 'delivery') {
      required('street', 'Informe a rua ou avenida.');
      required('number', 'Informe o número.');
      required('district', 'Informe o bairro.');
      required('city', 'Informe a cidade.');
    }
    const payment = selectedPayment();
    if (payment?.type === 'cash' && payment.askChange && changeInput.value.trim()) {
      if (parseMoney(changeInput.value) < currentTotals().total) errors.changeFor = 'O valor do troco deve ser maior que o total.';
    }
    return errors;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.values(fields).forEach((entry) => entry.setError(''));

    const errors = validate();
    if (Object.keys(errors).length) {
      for (const [name, message] of Object.entries(errors)) fields[name].setError(message);
      fields[Object.keys(errors)[0]].control.focus();
      return;
    }
    if (blockingReason()) return;

    const value = (name) => fields[name].control.value.trim();
    const payment = selectedPayment();
    const totals = currentTotals();
    const customer = { name: value('name'), phone: normalizePhoneBR(phoneInput.value) };
    const deliveryAddress =
      state.mode === 'delivery'
        ? { street: value('street'), number: value('number'), complement: value('complement'), district: value('district'), city: value('city'), reference: value('reference') }
        : {};

    const order = {
      id: uid('ord'),
      code: createOrderCode(),
      createdAt: new Date().toISOString(),
      mode: state.mode,
      customer,
      address: deliveryAddress,
      payment: {
        id: payment.id,
        type: payment.type,
        label: payment.label,
        pixKey: payment.pixKey ?? '',
        changeFor: payment.type === 'cash' && changeInput.value.trim() ? parseMoney(changeInput.value) : 0,
      },
      items: structuredClone(cart.items),
      totals,
      coupon: state.coupon?.code ?? '',
      note: noteInput.value.trim(),
    };

    saveOrder(slug, order);
    saveCustomer(slug, {
      name: customer.name,
      phone: phoneInput.value,
      mode: state.mode,
      paymentId: payment.id,
      address: state.mode === 'delivery' ? deliveryAddress : saved.address,
    });

    const url = buildWhatsAppUrl(profile.whatsapp, buildOrderMessage(order, store));
    cart.clear();
    sheet.close();
    onSent(order, url);
  });

  refresh();
  return sheet;
}
