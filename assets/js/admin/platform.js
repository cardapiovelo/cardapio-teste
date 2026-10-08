/**
 * Tela do administrador da plataforma (modo Firebase):
 * lista as lojas dos clientes, cria o acesso de um cliente novo, ativa/desativa e exclui.
 */
import { h, render } from '../core/dom.js';
import { isValidSlug } from '../core/slug.js';
import { slugify } from '../core/utils.js';
import { emptyState } from '../ui/empty-state.js';
import { icon } from '../ui/icons.js';
import { copyText } from '../core/clipboard.js';
import { confirmDialog, openSheet } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { btn, field, iconButton, pageHeader, textInput, toggle, withBusy } from './ui/form.js';
import { publicUrl, siteRoot } from './views/home.js';

const adminUrl = () => new URL('admin/index.html', siteRoot()).href;

async function copy(text, message = 'Copiado.') {
  if (await copyText(text)) toast(message, { type: 'success' });
  else toast('Não deu para copiar. Selecione o texto e copie.', { type: 'error' });
}

/**
 * @param {HTMLElement} root
 * @param {{ driver: object, user: { email: string }, onLogout: () => void }} params
 */
export function renderPlatform(root, { driver, user, onLogout }) {
  const { platform } = driver;
  const list = h('div', { 'aria-live': 'polite' });
  const content = h('main', { class: 'admin-main', id: 'admin-view', tabindex: '-1' });

  /* ---------- lista ---------- */
  async function refresh() {
    list.replaceChildren(h('p', { class: 'muted' }, 'Carregando as lojas...'));
    let stores;
    try {
      stores = await platform.listStores();
    } catch (error) {
      list.replaceChildren(
        emptyState({
          iconName: 'info',
          title: 'Não foi possível carregar as lojas',
          text: error.message,
          action: btn('Tentar de novo', { variant: 'primary', onClick: refresh }),
        }),
      );
      return;
    }
    if (!stores.length) {
      list.replaceChildren(emptyState({ iconName: 'store', title: 'Nenhuma loja ainda', text: 'Crie a primeira loja de um cliente com o botão "Nova loja".' }));
      return;
    }
    list.replaceChildren(h('ul', { class: 'stack-list' }, stores.map(storeCard)));
  }

  async function run(task, message) {
    try {
      await task();
      if (message) toast(message, { type: 'success' });
    } catch (error) {
      toast(error.message, { type: 'error' });
    }
    await refresh();
  }

  function storeCard(store) {
    const active = toggle({
      checked: store.active,
      label: store.active ? 'Ativa' : 'Desativada',
      hint: store.active ? '' : 'O cardápio está fora do ar.',
      onChange: (value) => run(() => platform.setActive(store.id, value), value ? 'Loja ativada.' : 'Loja desativada.'),
    });

    return h(
      'li',
      { class: 'item-card' },
      h(
        'div',
        { class: 'item-card__head' },
        h('strong', {}, store.name || store.id),
        h('span', { class: ['badge', !store.active && 'badge--danger'] }, store.active ? 'No ar' : 'Fora do ar'),
      ),
      h('div', { class: 'muted' }, `/${store.id} · ${store.ownerEmail || 'sem e-mail'}`),
      h(
        'div',
        { class: 'item-card__foot' },
        active.el,
        h(
          'div',
          { class: 'item-card__tools' },
          h('a', { class: 'btn btn--soft btn--small', href: `?loja=${store.id}#/inicio` }, icon('edit', { size: 16 }), 'Editar'),
          iconButton('external', 'Abrir o cardápio', () => window.open(publicUrl(store.id), '_blank', 'noopener')),
          iconButton('copy', 'Copiar o link do cardápio', () => copy(publicUrl(store.id), 'Link copiado.')),
          iconButton('lock', 'Enviar e-mail para redefinir a senha', () =>
            run(() => driver.sendPasswordReset(store.ownerEmail), `E-mail de redefinição enviado para ${store.ownerEmail}.`),
          ),
          iconButton(
            'trash',
            'Excluir a loja',
            async () => {
              const ok = await confirmDialog({
                title: `Excluir "${store.name || store.id}"?`,
                message: 'O cardápio e todos os produtos dessa loja serão apagados e o link deixa de funcionar. A conta de e-mail do cliente continua existindo. Não dá para desfazer.',
                confirmLabel: 'Excluir loja',
                danger: true,
              });
              if (ok) await run(() => platform.removeStore(store.id), 'Loja excluída.');
            },
            { danger: true },
          ),
        ),
      ),
    );
  }

  /* ---------- nova loja ---------- */
  function openNewStore() {
    let slugTouched = false;
    const error = h('p', { class: 'notice notice--warn', role: 'alert', hidden: true });
    const name = textInput({ maxlength: 80, placeholder: 'Ex.: Açaí do Zé', autocomplete: 'off' });
    const slug = textInput({ maxlength: 40, placeholder: 'acai-do-ze', autocapitalize: 'none', spellcheck: 'false' });
    const email = textInput({ type: 'email', placeholder: 'cliente@email.com', autocomplete: 'off', autocapitalize: 'none' });
    const password = textInput({ type: 'text', placeholder: 'Mínimo de 8 caracteres', autocomplete: 'off', autocapitalize: 'none' });
    const examples = toggle({ checked: true, label: 'Começar com produtos de exemplo', hint: 'O cliente troca ou apaga tudo no painel.' });
    const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--grow' }, 'Criar loja');

    name.addEventListener('input', () => {
      if (!slugTouched) slug.value = slugify(name.value);
    });
    slug.addEventListener('input', () => {
      slugTouched = true;
    });

    const fail = (message) => {
      error.textContent = message;
      error.hidden = false;
    };

    const form = h(
      'form',
      {
        class: 'stack',
        novalidate: true,
        onSubmit: (event) => {
          event.preventDefault();
          error.hidden = true;
          const values = { name: name.value.trim(), slug: slug.value.trim().toLowerCase(), email: email.value.trim(), password: password.value };
          if (values.name.length < 2) return fail('Informe o nome da loja.');
          if (!isValidSlug(values.slug)) return fail('O endereço precisa ter de 3 a 40 letras, números ou hífen, e não pode ser uma palavra reservada.');
          if (!/^\S+@\S+\.\S+$/.test(values.email)) return fail('Informe o e-mail do cliente.');
          if (values.password.length < 8) return fail('A senha provisória precisa ter pelo menos 8 caracteres.');
          return withBusy(submit, async () => {
            try {
              await platform.createStore({ ...values, withExamples: examples.input.checked });
              sheet.close();
              await refresh();
              showAccess(values);
            } catch (failure) {
              fail(failure.message);
            }
          });
        },
      },
      error,
      field('Nome da loja', name),
      field('Endereço do cardápio', slug, { hint: 'Vira o link: ...?loja=endereco' }),
      field('E-mail do cliente', email, { hint: 'É o login dele no painel.' }),
      field('Senha provisória', password, { hint: 'Passe para o cliente. Ele pode trocar depois em "Backup e conta".' }),
      examples.el,
    );
    const sheet = openSheet({ title: 'Nova loja', body: form, footer: submit });
    submit.addEventListener('click', (event) => {
      event.preventDefault();
      form.requestSubmit();
    });
    name.focus();
  }

  /** Resumo pronto para copiar e mandar para o cliente. */
  function showAccess({ slug, email, password }) {
    const message = [
      'Seu cardápio digital está pronto!',
      '',
      `Painel (para editar): ${adminUrl()}`,
      `E-mail: ${email}`,
      `Senha: ${password}`,
      '',
      `Cardápio (para os clientes): ${publicUrl(slug)}`,
    ].join('\n');
    const sheet = openSheet({
      title: 'Loja criada',
      body: h(
        'div',
        { class: 'stack' },
        h('p', { class: 'muted' }, 'Copie e envie ao cliente. A senha não aparece de novo.'),
        h('pre', { class: 'access-box' }, message),
      ),
      footer: [btn('Copiar', { variant: 'primary', size: null, iconName: 'copy', onClick: () => copy(message, 'Dados copiados.') }), btn('Fechar', { size: null, onClick: () => sheet.close() })],
    });
  }

  content.append(
    pageHeader('Lojas dos clientes', 'Crie o acesso de cada comércio e controle quem está no ar.', btn('Nova loja', { variant: 'primary', iconName: 'plus', onClick: openNewStore })),
    list,
    h('p', { class: 'muted' }, `Você entrou como ${user.email}.`),
  );

  render(
    root,
    h(
      'div',
      { class: 'admin-shell admin-shell--solo' },
      h(
        'header',
        { class: 'admin-top' },
        h('div', { class: 'admin-brand' }, h('span', { class: 'admin-brand__logo admin-brand__logo--empty' }, icon('store', { size: 20 })), h('span', { class: 'admin-brand__name' }, 'Painel do administrador')),
        h('div', { class: 'admin-top__actions' }, h('button', { type: 'button', class: 'btn btn--ghost btn--small admin-top__logout', onClick: onLogout }, icon('logout', { size: 16 }), 'Sair')),
      ),
      content,
    ),
  );
  refresh();
}
