import { CONFIG } from '../config.js';
import { h } from '../core/dom.js';
import { icon } from '../ui/icons.js';

const DISMISS_KEY = `${CONFIG.storageNamespace}:install-dismissed`;
const DISMISS_DAYS = 7;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

function recentlyDismissed() {
  const at = Number(localStorage.getItem(DISMISS_KEY));
  return at && Date.now() - at < DISMISS_DAYS * 86_400_000;
}

/** Faixa "Adicionar à tela inicial" (Android/desktop via prompt nativo; iOS com instrução). */
export function initInstallPrompt({ storeName, logo }) {
  if (isStandalone() || recentlyDismissed()) return;

  let deferred = null;

  const banner = h('aside', { class: 'install-banner', hidden: true, role: 'dialog', 'aria-label': 'Instalar aplicativo' });

  const close = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    banner.hidden = true;
  };

  const show = (description, action) => {
    banner.replaceChildren(
      logo ? h('img', { src: logo, alt: '', class: 'install-banner__logo' }) : icon('bowl', { size: 28 }),
      h('div', { class: 'install-banner__text' }, h('strong', {}, `Tenha o ${storeName} na tela inicial`), h('span', {}, description)),
      action,
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Dispensar', onClick: close }, icon('close', { size: 18 })),
    );
    banner.hidden = false;
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    show(
      'Peça mais rápido, sem abrir o navegador.',
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--accent btn--small',
          onClick: async () => {
            banner.hidden = true;
            deferred.prompt();
            await deferred.userChoice;
            deferred = null;
          },
        },
        'Instalar',
      ),
    );
  });

  window.addEventListener('appinstalled', () => {
    banner.hidden = true;
  });

  if (isIos()) {
    show('No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".', null);
  }

  document.body.append(banner);
}
