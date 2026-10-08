/** Ponto de entrada do painel da loja. */
import { CONFIG } from '../config.js';
import { h, render } from '../core/dom.js';
import { resolveSlug } from '../core/slug.js';
import { getDriver } from '../storage/index.js';
import { emptyState } from '../ui/empty-state.js';
import { toast } from '../ui/toast.js';
import { renderAuthScreen } from './auth-screen.js';
import { renderPlatform } from './platform.js';
import { createSession } from './session.js';
import { mountShell } from './shell.js';

const root = document.getElementById('admin-root');
const lastSlugKey = `${CONFIG.storageNamespace}:admin-slug`;

let unmount = () => {};

async function start() {
  unmount();
  const driver = await getDriver();
  const remembered = localStorage.getItem(lastSlugKey) ?? CONFIG.defaultSlug;
  let slug = resolveSlug(location.search, remembered);

  const showAuth = (mode) => renderAuthScreen(root, { driver, slug, mode, onDone: finishAuth });

  const finishAuth = (newSlug) => {
    if (newSlug) {
      localStorage.setItem(lastSlugKey, newSlug);
      history.replaceState(null, '', `?loja=${newSlug}${location.hash}`);
    }
    start();
  };

  const emailMode = driver.authMode === 'email';
  if (emailMode) {
    if (!driver.isAuthenticated()) return showAuth('login');
    const user = driver.currentUser();
    const logout = () => {
      driver.logout();
      history.replaceState(null, '', location.pathname);
      start();
    };
    if (user.isAdmin && !new URLSearchParams(location.search).get('loja')) {
      return renderPlatform(root, { driver, user, onLogout: logout });
    }
    // O dono só enxerga a própria loja, não importa o que esteja na URL.
    if (!user.isAdmin) {
      slug = user.slug;
      if (new URLSearchParams(location.search).get('loja') !== slug) history.replaceState(null, '', `?loja=${slug}${location.hash}`);
    }
  } else if (driver.requiresAuth && !driver.isAuthenticated(slug)) {
    return showAuth('login');
  }

  let store;
  try {
    store = await driver.load(slug);
  } catch (error) {
    return render(
      root,
      emptyState({
        iconName: 'info',
        title: 'Não foi possível abrir o painel',
        text: error.message,
        action: h('button', { type: 'button', class: 'btn btn--primary', onClick: () => start() }, 'Tentar de novo'),
      }),
    );
  }
  if (!store) {
    if (!emailMode) return showAuth('create');
    return render(
      root,
      emptyState({
        iconName: 'info',
        title: 'Loja não encontrada',
        text: `Não existe uma loja com o endereço "${slug}".`,
        action: h('a', { class: 'btn btn--primary', href: location.pathname }, 'Voltar'),
      }),
    );
  }

  localStorage.setItem(lastSlugKey, slug);
  const session = createSession({
    slug,
    driver,
    store,
    onAuthLost: () => {
      toast('Sua sessão expirou. Entre de novo.', { type: 'error' });
      start();
    },
  });

  const isAdmin = emailMode && driver.currentUser()?.isAdmin;
  unmount = mountShell(root, {
    session,
    onBack: isAdmin ? () => (location.href = location.pathname) : null,
    onLogout: () => {
      driver.logout(slug);
      if (emailMode) history.replaceState(null, '', location.pathname);
      start();
    },
  });
  return undefined;
}

start().catch((error) => {
  console.error(error);
  render(root, emptyState({ iconName: 'info', title: 'Algo deu errado', text: 'Recarregue a página para tentar de novo.' }));
});
