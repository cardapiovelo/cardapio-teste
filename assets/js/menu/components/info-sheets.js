import { h } from '../../core/dom.js';
import { formatBRL, formatDuration, formatPhoneBR } from '../../core/utils.js';
import { DAYS } from '../../domain/schema.js';
import { zonedNow } from '../../domain/status.js';
import { formatAddress } from '../../domain/whatsapp.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/modal.js';

const infoRow = (iconName, label, value) =>
  h('div', { class: 'info-row' }, icon(iconName, { size: 20 }), h('div', {}, h('dt', {}, label), h('dd', {}, value)));

/** Horários de funcionamento, com o dia de hoje em destaque. */
export function openHoursSheet(store) {
  const today = zonedNow(store.settings.timeZone).day;
  const rows = store.hours.map((entry) =>
    h(
      'tr',
      { class: entry.day === today ? 'is-today' : '' },
      h('th', { scope: 'row' }, DAYS[entry.day]),
      h('td', {}, entry.open ? `${entry.from} às ${entry.to}` : 'Fechado'),
    ),
  );
  return openSheet({
    title: 'Horários de funcionamento',
    body: h('table', { class: 'hours-table' }, h('tbody', {}, rows)),
  });
}

/** Sobre a loja: descrição, endereço e contatos. */
export function openAboutSheet(store) {
  const { profile } = store;
  const address = formatAddress(profile.address).replaceAll(' | ', ', ');
  return openSheet({
    title: `Sobre ${profile.name}`,
    body: h(
      'div',
      { class: 'about' },
      profile.about && h('p', { class: 'about__text' }, profile.about),
      h(
        'dl',
        { class: 'info-list' },
        address && infoRow('pin', 'Endereço', address),
        profile.whatsapp && infoRow('whatsapp', 'WhatsApp', formatPhoneBR(profile.whatsapp)),
        profile.instagram && infoRow('external', 'Instagram', `@${profile.instagram}`),
      ),
    ),
  });
}

/** Entrega, retirada, pedido mínimo e formas de pagamento. */
export function openMoreInfoSheet(store) {
  const { settings } = store;
  const payments = store.payments.filter((payment) => payment.enabled).map((payment) => payment.label);
  const fee =
    settings.deliveryFee > 0
      ? `${formatBRL(settings.deliveryFee)}${settings.freeDeliveryAbove > 0 ? `, grátis acima de ${formatBRL(settings.freeDeliveryAbove)}` : ''}`
      : 'Grátis';

  return openSheet({
    title: 'Mais informações',
    body: h(
      'dl',
      { class: 'info-list' },
      settings.minOrder > 0 && infoRow('tag', 'Pedido mínimo', formatBRL(settings.minOrder)),
      settings.deliveryEnabled && infoRow('bag', 'Entrega', `${fee}. Chega em cerca de ${formatDuration(settings.deliveryTimeMin)}.`),
      infoRow('store', 'Retirada no local', settings.pickupEnabled ? `Aceita. Pronto em cerca de ${formatDuration(settings.pickupTimeMin)}.` : 'Não aceita'),
      payments.length > 0 && infoRow('wallet', 'Formas de pagamento', payments.join(', ')),
    ),
  });
}
