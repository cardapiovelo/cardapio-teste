import { h, render } from '../core/dom.js';
import { applyTheme } from '../core/theme.js';
import { safeUrl } from '../core/utils.js';
import { icon } from '../ui/icons.js';
import { VIEWS } from './views/index.js';
import { publicUrl } from './views/home.js';

const viewFromHash = () => VIEWS.find((view) => `#/${view.id}` === location.hash) ?? VIEWS[0];

/**
 * Estrutura do painel: barra de cima, menu e a tela atual.
 * O menu usa o hash da URL (#/produtos), então voltar e favoritos funcionam.
 */
export function mountShell(root, { session, onLogout, onBack = null }) {
  const { slug, driver } = session;
  const content = h('main', { class: 'admin-main', id: 'admin-view', tabindex: '-1' });
  const nav = h('nav', { class: 'admin-nav', 'aria-label': 'Seções do painel' });
  const brand = h('div', { class: 'admin-brand' });

  const ctx = {
    slug,
    driver,
    get store() {
      return session.store;
    },
    commit: session.commit.bind(session),
    navigate: (id) => {
      location.hash = `#/${id}`;
    },
    refresh: () => drawView(),
  };

  function drawBrand() {
    const { profile } = session.store;
    const logo = safeUrl(profile.logo);
    brand.replaceChildren(
      logo ? h('img', { class: 'admin-brand__logo', src: logo, alt: '' }) : h('span', { class: 'admin-brand__logo admin-brand__logo--empty' }, icon('bowl', { size: 20 })),
      h('span', { class: 'admin-brand__name' }, profile.name),
    );
  }

  function drawNav(active) {
    nav.replaceChildren(
      ...VIEWS.map((view) =>
        h(
          'a',
          { class: ['admin-nav__item', view.id === active.id && 'is-active'], href: `#/${view.id}`, 'aria-current': view.id === active.id ? 'page' : undefined },
          icon(view.iconName, { size: 20 }),
          h('span', {}, view.label),
        ),
      ),
    );
  }

  function drawView() {
    const view = viewFromHash();
    drawNav(view);
    view.render(content, ctx);
  }

  const onHashChange = () => {
    drawView();
    window.scrollTo({ top: 0 });
    content.focus({ preventScroll: true });
  };
  window.addEventListener('hashchange', onHashChange);

  session.subscribe((store) => {
    applyTheme(store.theme);
    drawBrand();
  });

  applyTheme(session.store.theme);
  drawBrand();

  render(
    root,
    h(
      'div',
      { class: 'admin-shell' },
      h(
        'header',
        { class: 'admin-top' },
        brand,
        h(
          'div',
          { class: 'admin-top__actions' },
          onBack && h('button', { type: 'button', class: 'btn btn--ghost btn--small', onClick: onBack }, icon('list', { size: 16 }), 'Todas as lojas'),
          h('a', { class: 'btn btn--accent btn--small', href: publicUrl(slug), target: '_blank', rel: 'noopener noreferrer' }, icon('eye', { size: 16 }), 'Ver cardápio'),
          driver.requiresAuth && h('button', { type: 'button', class: 'btn btn--ghost btn--small admin-top__logout', onClick: onLogout }, icon('logout', { size: 16 }), 'Sair'),
        ),
      ),
      nav,
      content,
    ),
  );

  drawView();
  return () => window.removeEventListener('hashchange', onHashChange);
}
