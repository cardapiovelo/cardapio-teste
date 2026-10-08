import { h, render } from '../core/dom.js';
import { isValidSlug } from '../core/slug.js';
import { slugify } from '../core/utils.js';
import { createDefaultStore } from '../domain/schema.js';
import { createStarterStore } from '../domain/demo-data.js';
import { field, textInput, withBusy } from './ui/form.js';
import { icon } from '../ui/icons.js';

/**
 * Entrar na loja ou criar uma loja nova.
 * No modo local (sem servidor) só existe "criar", sem senha.
 */
export function renderAuthScreen(root, { driver, slug, mode = 'login', onDone }) {
  const emailMode = driver.authMode === 'email';
  const canLogin = driver.requiresAuth;
  let current = canLogin ? mode : 'create';
  let setupMode = false;

  const draw = () => {
    const error = h('p', { class: 'notice notice--warn', role: 'alert', hidden: true });
    const fail = (message) => {
      error.textContent = message;
      error.className = 'notice notice--warn';
      error.hidden = false;
    };
    const notify = (message) => {
      error.textContent = message;
      error.className = 'notice';
      error.hidden = false;
    };

    const form = emailMode
      ? setupMode
        ? setupForm({ driver, fail, onDone, back: () => { setupMode = false; draw(); } })
        : emailLoginForm({ driver, fail, notify, onDone, firstAccess: () => { setupMode = true; draw(); } })
      : current === 'login'
        ? loginForm({ driver, slug, fail, onDone })
        : createForm({ driver, slug, fail, onDone });
    const tabs = canLogin && !emailMode
      ? h(
          'div',
          { class: 'tabs', role: 'tablist' },
          ['login', 'create'].map((name) =>
            h(
              'button',
              {
                type: 'button',
                role: 'tab',
                class: ['tabs__item', current === name && 'is-active'],
                'aria-selected': String(current === name),
                onClick: () => {
                  current = name;
                  draw();
                },
              },
              name === 'login' ? 'Entrar' : 'Criar minha loja',
            ),
          ),
        )
      : null;

    render(
      root,
      h(
        'main',
        { class: 'auth' },
        h(
          'div',
          { class: 'auth__card' },
          h('span', { class: 'auth__mark' }, icon('bowl', { size: 34 })),
          h('h1', { class: 'auth__title' }, setupMode ? 'Primeiro acesso' : current === 'login' ? 'Painel da loja' : 'Criar sua loja'),
          h(
            'p',
            { class: 'auth__text' },
            setupMode
              ? 'Cria a conta de administrador da plataforma. Só funciona uma vez, com o código de instalação que você colocou nas regras do Firestore.'
              : current === 'login'
              ? emailMode
                ? 'Entre com o e-mail e a senha que você recebeu para editar o cardápio, os preços e os horários.'
                : 'Entre para editar o cardápio, os preços e os horários.'
              : driver.requiresAuth
                ? 'Escolha o nome e o endereço do seu cardápio. Você poderá mudar o resto depois.'
                : 'Nenhuma loja encontrada com este endereço. Crie uma para começar.',
          ),
          tabs,
          error,
          form,
        ),
      ),
    );
  };

  draw();
}

/** Login do modo Firebase: e-mail e senha. A loja vem da conta. */
function emailLoginForm({ driver, fail, notify, onDone, firstAccess }) {
  const emailInput = textInput({ type: 'email', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', inputmode: 'email' });
  const passwordInput = textInput({ type: 'password', autocomplete: 'current-password' });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Entrar');
  const forgot = h('button', { type: 'button', class: 'link-btn' }, 'Esqueci minha senha');

  forgot.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Digite seu e-mail acima e toque em "Esqueci minha senha".');
    return withBusy(forgot, async () => {
      try {
        await driver.sendPasswordReset(email);
        notify('Se esse e-mail tiver uma conta, enviamos o link para criar uma senha nova. Confira também o spam.');
      } catch (error) {
        fail(error.message);
      }
    });
  });

  return h(
    'form',
    {
      class: 'auth__form',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        if (!emailInput.value.trim() || !passwordInput.value) return fail('Informe o e-mail e a senha.');
        return withBusy(submit, async () => {
          try {
            await driver.login(emailInput.value, passwordInput.value);
            onDone();
          } catch (error) {
            fail(error.message);
          }
        });
      },
    },
    field('E-mail', emailInput),
    field('Senha', passwordInput),
    submit,
    forgot,
    h('button', { type: 'button', class: 'link-btn', onClick: firstAccess }, 'Primeiro acesso do administrador'),
  );
}

/** Instalação: cria o administrador e deixa o Firestore pronto (as coleções nascem na primeira gravação). */
function setupForm({ driver, fail, onDone, back }) {
  const emailInput = textInput({ type: 'email', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', inputmode: 'email' });
  const passwordInput = textInput({ type: 'password', autocomplete: 'new-password' });
  const codeInput = textInput({ autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Criar administrador');

  return h(
    'form',
    {
      class: 'auth__form',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) return fail('Informe um e-mail válido.');
        if (passwordInput.value.length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.');
        if (!codeInput.value.trim()) return fail('Informe o código de instalação.');
        return withBusy(submit, async () => {
          try {
            await driver.setupAdmin({ email: emailInput.value, password: passwordInput.value, code: codeInput.value });
            onDone();
          } catch (error) {
            fail(error.message);
          }
        });
      },
    },
    field('E-mail do administrador', emailInput),
    field('Senha', passwordInput, { hint: 'Se a conta já existe no Firebase, use a senha dela.' }),
    field('Código de instalação', codeInput, { hint: 'É o texto que você colocou no lugar de TROQUE-ESTE-CODIGO nas regras.' }),
    submit,
    h('button', { type: 'button', class: 'link-btn', onClick: back }, 'Voltar para o login'),
  );
}

function loginForm({ driver, slug, fail, onDone }) {
  const slugInput = textInput({ value: slug, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
  const passwordInput = textInput({ type: 'password', autocomplete: 'current-password' });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Entrar');

  return h(
    'form',
    {
      class: 'auth__form',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        const value = slugInput.value.trim().toLowerCase();
        if (!isValidSlug(value)) return fail('Confira o endereço da loja: use letras, números e hífen.');
        return withBusy(submit, async () => {
          try {
            await driver.login(value, passwordInput.value);
            onDone(value);
          } catch (error) {
            fail(error.message);
          }
        });
      },
    },
    field('Endereço da loja', slugInput, { hint: 'É o final do link do seu cardápio.' }),
    field('Senha', passwordInput),
    submit,
  );
}

function createForm({ driver, slug, fail, onDone }) {
  const needsPassword = driver.requiresAuth;
  let slugTouched = false;

  const nameInput = textInput({ maxlength: 80, autocomplete: 'organization', placeholder: 'Ex.: Açaí da Praça' });
  const slugInput = textInput({ value: slug === 'demo' ? '' : slug, autocapitalize: 'none', spellcheck: 'false', placeholder: 'acai-da-praca' });
  const passwordInput = textInput({ type: 'password', autocomplete: 'new-password', minlength: 8 });
  const starterInput = h('input', { type: 'checkbox', class: 'toggle__input', checked: true });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, 'Criar loja');

  nameInput.addEventListener('input', () => {
    if (!slugTouched) slugInput.value = slugify(nameInput.value);
  });
  slugInput.addEventListener('input', () => {
    slugTouched = true;
  });

  return h(
    'form',
    {
      class: 'auth__form',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        const value = slugInput.value.trim().toLowerCase();
        if (name.length < 2) return fail('Informe o nome da loja.');
        if (!isValidSlug(value)) return fail('O endereço precisa ter de 3 a 40 letras, números ou hífen, e não pode ser uma palavra reservada.');
        if (needsPassword && passwordInput.value.length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.');
        return withBusy(submit, async () => {
          try {
            const store = starterInput.checked ? createStarterStore({ slug: value, name }) : createDefaultStore({ slug: value, name });
            await driver.create({ slug: value, name, password: passwordInput.value, store });
            onDone(value);
          } catch (error) {
            fail(error.message);
          }
        });
      },
    },
    field('Nome da loja', nameInput),
    field('Endereço do cardápio', slugInput, { hint: 'Vira o link: seusite.com/?loja=endereco' }),
    needsPassword && field('Senha do painel', passwordInput, { hint: 'Mínimo de 8 caracteres.' }),
    h(
      'label',
      { class: 'toggle' },
      starterInput,
      h('span', { class: 'toggle__track', 'aria-hidden': 'true' }),
      h('span', { class: 'toggle__text' }, 'Começar com produtos de exemplo', h('small', {}, 'Você troca ou apaga tudo no painel.')),
    ),
    submit,
  );
}
