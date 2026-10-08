import { copyText } from '../../core/clipboard.js';
import { h } from '../../core/dom.js';
import { getStoreStatus } from '../../domain/status.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { btn, pageHeader, panel } from '../ui/form.js';

export const id = 'inicio';
export const label = 'Início';
export const iconName = 'home';

/** Raiz do site, calculada pela posição deste arquivo (funciona com ou sem "/" no fim do endereço do painel). */
export const siteRoot = () => new URL('../../../../', import.meta.url);

/** Servidores de teste (localhost ou IP da rede) nem sempre abrem a pasta sozinhos; hospedagens de verdade sim. */
const isTestHost = () => /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/.test(location.hostname);

/** Link do cardápio para o cliente: limpo (`.../?loja=endereco`) em hospedagem real. */
export const publicUrl = (slug) => {
  const url = new URL(isTestHost() ? 'index.html' : './', siteRoot());
  url.searchParams.set('loja', slug);
  return url.href;
};

async function copy(text) {
  if (await copyText(text)) toast('Link copiado.', { type: 'success' });
  else toast('Não deu para copiar. Selecione o link e copie.', { type: 'error' });
}

function checklist(store) {
  const { profile } = store;
  return [
    { done: Boolean(profile.whatsapp), text: 'Cadastrar o WhatsApp que recebe os pedidos', view: 'loja' },
    { done: Boolean(profile.logo), text: 'Enviar a logo da loja', view: 'loja' },
    { done: Boolean(profile.address.street || profile.address.city), text: 'Informar o endereço', view: 'loja' },
    { done: store.categories.length > 0, text: 'Criar as categorias do cardápio', view: 'categorias' },
    { done: store.products.length > 0, text: 'Cadastrar os produtos', view: 'produtos' },
    { done: store.payments.some((p) => p.type === 'pix' && p.enabled && p.pixKey) || !store.payments.some((p) => p.type === 'pix' && p.enabled), text: 'Informar a chave Pix (ou desligar o Pix)', view: 'entrega' },
  ];
}

/** Barra de espaço usado (só nos modos em que o cardápio tem limite de tamanho). */
function usagePanel(driver, store) {
  const usage = driver.usage?.(store);
  if (!usage) return null;
  const percent = Math.min(100, Math.round(usage.ratio * 100));
  const bar = h('span', { class: ['meter__bar', usage.ratio > 0.8 && 'is-high'] });
  bar.style.width = `${Math.max(2, percent)}%`;
  return panel(
    'Espaço do cardápio',
    h('div', { class: 'meter', role: 'img', 'aria-label': `${percent}% do espaço usado` }, bar),
    h(
      'p',
      { class: usage.ratio > 0.8 ? 'notice notice--warn' : 'muted' },
      usage.ratio > 0.8
        ? `${percent}% usado. Está acabando: use fotos menores ou remova algumas para continuar editando.`
        : `${percent}% usado. As fotos são o que mais pesa.`,
    ),
  );
}

export function render(container, ctx) {
  const { store } = ctx;
  const status = getStoreStatus(store);
  const link = publicUrl(ctx.slug);
  const steps = checklist(store);
  const pending = steps.filter((step) => !step.done);

  container.replaceChildren(
    pageHeader(`Olá, ${store.profile.name}`, 'Aqui você edita tudo o que aparece no cardápio.'),

    panel(
      'Link do seu cardápio',
      h('div', { class: 'link-box' }, h('code', { class: 'link-box__url' }, link)),
      h(
        'div',
        { class: 'actions' },
        btn('Copiar link', { variant: 'primary', iconName: 'copy', onClick: () => copy(link) }),
        h('a', { class: 'btn btn--soft btn--small', href: link, target: '_blank', rel: 'noopener noreferrer' }, icon('external', { size: 16 }), 'Abrir cardápio'),
      ),
      ctx.driver.name === 'local' && h('p', { class: 'notice notice--warn' }, 'Modo local: o cardápio fica salvo só neste navegador. Para publicar para os clientes, use o modo servidor (veja o README).'),
    ),

    h(
      'div',
      { class: 'stats' },
      h('div', { class: ['stat', status.isOpen ? 'is-ok' : 'is-off'] }, h('strong', {}, status.label), h('span', {}, status.detail || 'Agora')),
      h('div', { class: 'stat' }, h('strong', {}, String(store.products.length)), h('span', {}, 'Produtos')),
      h('div', { class: 'stat' }, h('strong', {}, String(store.categories.length)), h('span', {}, 'Categorias')),
      h('div', { class: 'stat' }, h('strong', {}, String(store.coupons.length)), h('span', {}, 'Cupons')),
    ),

    panel(
      pending.length ? 'Para deixar tudo pronto' : 'Tudo pronto',
      pending.length
        ? h(
            'ul',
            { class: 'checklist' },
            steps.map((step) =>
              h(
                'li',
                { class: step.done ? 'is-done' : '' },
                icon(step.done ? 'check' : 'chevron-right', { size: 18 }),
                step.done ? h('span', {}, step.text) : h('button', { type: 'button', class: 'link-btn', onClick: () => ctx.navigate(step.view) }, step.text),
              ),
            ),
          )
        : h('p', {}, 'Os dados principais da loja estão preenchidos. Compartilhe o link com seus clientes.'),
    ),

    usagePanel(ctx.driver, store),
  );
}
