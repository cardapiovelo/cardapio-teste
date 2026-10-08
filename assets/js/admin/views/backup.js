import { h } from '../../core/dom.js';
import { createDemoStore } from '../../domain/demo-data.js';
import { normalizeStore } from '../../domain/schema.js';
import { confirmDialog } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { btn, field, pageHeader, panel, textInput, withBusy } from '../ui/form.js';

export const id = 'conta';
export const label = 'Backup e conta';
export const iconName = 'download';

function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function render(container, ctx) {
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    let imported;
    try {
      imported = normalizeStore(JSON.parse(await file.text()));
    } catch {
      return toast('Esse arquivo não é um backup válido.', { type: 'error' });
    }
    const ok = await confirmDialog({
      title: 'Substituir o cardápio?',
      message: `O backup tem ${imported.products.length} produtos e ${imported.categories.length} categorias. Tudo o que está no painel agora será trocado.`,
      confirmLabel: 'Substituir',
      danger: true,
    });
    if (ok && (await ctx.commit((draft) => Object.assign(draft, imported), { message: 'Backup restaurado.' }))) ctx.refresh();
    return undefined;
  });

  const backupPanel = panel(
    'Backup do cardápio',
    h('p', { class: 'muted' }, 'Baixe uma cópia de tudo (produtos, preços, horários, cores) ou restaure uma cópia anterior.'),
    h(
      'div',
      { class: 'actions' },
      btn('Baixar backup', { variant: 'primary', iconName: 'download', onClick: () => downloadJson(`cardapio-${ctx.slug}.json`, ctx.store) }),
      btn('Restaurar backup', { iconName: 'upload', onClick: () => fileInput.click() }),
      fileInput,
    ),
  );

  const resetPanel =
    ctx.driver.name === 'local' &&
    panel(
      'Voltar ao cardápio de exemplo',
      h('p', { class: 'muted' }, 'Apaga o que você cadastrou neste navegador e restaura o cardápio de demonstração.'),
      h(
        'div',
        { class: 'actions' },
        btn('Restaurar exemplo', {
          variant: 'danger',
          onClick: async () => {
            const ok = await confirmDialog({ title: 'Apagar tudo?', message: 'Seu cardápio atual será substituído pelo exemplo. Baixe um backup antes se quiser guardar.', confirmLabel: 'Apagar e restaurar', danger: true });
            if (ok && (await ctx.commit((draft) => Object.assign(draft, createDemoStore(ctx.slug)), { message: 'Cardápio de exemplo restaurado.' }))) ctx.refresh();
          },
        }),
      ),
    );

  let accountPanel = null;
  if (ctx.driver.requiresAuth) {
    const current = textInput({ type: 'password', autocomplete: 'current-password' });
    const next = textInput({ type: 'password', autocomplete: 'new-password' });
    const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--small' }, 'Trocar senha');
    accountPanel = panel(
      'Senha do painel',
      h(
        'form',
        {
          onSubmit: (event) => {
            event.preventDefault();
            if (next.value.length < 8) return toast('A nova senha precisa ter ao menos 8 caracteres.', { type: 'error' });
            return withBusy(submit, async () => {
              try {
                await ctx.driver.changePassword(ctx.slug, current.value, next.value);
                current.value = next.value = '';
                toast('Senha alterada.', { type: 'success' });
              } catch (error) {
                toast(error.message, { type: 'error' });
              }
            });
          },
        },
        field('Senha atual', current),
        field('Nova senha', next, { hint: 'Mínimo de 8 caracteres.' }),
        submit,
      ),
    );
  }

  container.replaceChildren(pageHeader('Backup e conta', 'Guarde uma cópia do seu cardápio e cuide do acesso ao painel.'), backupPanel, resetPanel, accountPanel);
}
