import { h } from '../../core/dom.js';
import { formatDuration, formatBRL, safeUrl } from '../../core/utils.js';
import { formatAddress } from '../../domain/whatsapp.js';
import { getStoreStatus } from '../../domain/status.js';
import { icon } from '../../ui/icons.js';

const mapsUrl = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(address).replaceAll(' | ', ', '))}`;

function quickLink({ label, iconName, onClick, href }) {
  const content = [icon(iconName, { size: 18 }), h('span', {}, label)];
  return href
    ? h('a', { class: 'quick-link', href, target: '_blank', rel: 'noopener noreferrer' }, ...content)
    : h('button', { type: 'button', class: 'quick-link', onClick }, ...content);
}

/**
 * Topo do cardápio: capa, logo, nome, status aberto/fechado e atalhos.
 * @returns {{ refreshStatus: () => void }}
 */
export function renderHeader(root, store, { onAbout, onHours, onMoreInfo }) {
  const { profile, settings } = store;
  const cover = safeUrl(profile.cover);
  const logo = safeUrl(profile.logo);
  const hasAddress = Boolean(profile.address.street || profile.address.city);

  const statusEl = h('p', { class: 'status', role: 'status' });
  const refreshStatus = () => {
    const status = getStoreStatus(store);
    statusEl.classList.toggle('is-open', status.isOpen);
    statusEl.classList.toggle('is-closed', !status.isOpen);
    statusEl.replaceChildren(
      h('span', { class: 'status__dot', 'aria-hidden': 'true' }),
      h('strong', {}, status.label),
      status.detail && h('span', { class: 'status__detail' }, status.detail),
    );
  };

  const facts = [
    settings.deliveryEnabled && { iconName: 'bag', text: `Entrega em ${formatDuration(settings.deliveryTimeMin)}` },
    settings.pickupEnabled && { iconName: 'store', text: `Retirada em ${formatDuration(settings.pickupTimeMin)}` },
    settings.minOrder > 0 && { iconName: 'tag', text: `Pedido mínimo ${formatBRL(settings.minOrder)}` },
  ].filter(Boolean);

  root.replaceChildren(
    h('div', { class: 'hero' }, cover && h('img', { class: 'hero__img', src: cover, alt: '', decoding: 'async' })),
    h(
      'div',
      { class: 'identity' },
      logo
        ? h('img', { class: 'identity__logo', src: logo, alt: `Logo de ${profile.name}` })
        : h('span', { class: 'identity__logo identity__logo--empty' }, icon('bowl', { size: 38 })),
      h('div', { class: 'identity__text' }, h('h1', { class: 'identity__name' }, profile.name), profile.tagline && h('p', { class: 'identity__tagline' }, profile.tagline)),
    ),
    statusEl,
    facts.length > 0 &&
      h(
        'button',
        { type: 'button', class: 'facts', onClick: onMoreInfo, 'aria-label': 'Ver mais informações da loja' },
        ...facts.map((fact) => h('span', { class: 'facts__item' }, icon(fact.iconName, { size: 16 }), fact.text)),
        icon('chevron-right', { size: 16, className: 'facts__chevron' }),
      ),
    h(
      'nav',
      { class: 'quick-links', 'aria-label': 'Informações da loja' },
      quickLink({ label: 'Sobre', iconName: 'info', onClick: onAbout }),
      quickLink({ label: 'Horários', iconName: 'clock', onClick: onHours }),
      profile.whatsapp && quickLink({ label: 'WhatsApp', iconName: 'whatsapp', href: `https://wa.me/${profile.whatsapp}` }),
      hasAddress && quickLink({ label: 'Como chegar', iconName: 'pin', href: mapsUrl(profile.address) }),
    ),
  );

  refreshStatus();
  return { refreshStatus };
}
