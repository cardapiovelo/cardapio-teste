import { h } from '../../core/dom.js';
import { applyTheme, readableInk, THEME_PRESETS } from '../../core/theme.js';
import { icon } from '../../ui/icons.js';
import { field, pageHeader, panel, withBusy } from '../ui/form.js';

export const id = 'aparencia';
export const label = 'Cores';
export const iconName = 'palette';

export function render(container, ctx) {
  const { theme } = ctx.store;
  let primary = theme.primary;
  let accent = theme.accent;

  const primaryInput = h('input', { type: 'color', class: 'color-input', value: primary, 'aria-label': 'Cor principal' });
  const accentInput = h('input', { type: 'color', class: 'color-input', value: accent, 'aria-label': 'Cor de destaque' });

  const preview = h(
    'div',
    { class: 'theme-preview' },
    h('div', { class: 'theme-preview__bar' }, h('strong', {}, ctx.store.profile.name), icon('cart', { size: 20 })),
    h(
      'div',
      { class: 'theme-preview__body' },
      h('span', { class: 'theme-preview__chip is-active' }, 'Açaí'),
      h('span', { class: 'theme-preview__chip' }, 'Sorvetes'),
      h('p', { class: 'theme-preview__price' }, 'R$ 17,00'),
      h('span', { class: 'theme-preview__tag' }, 'Obrigatório'),
      h('span', { class: 'theme-preview__button' }, 'Adicionar'),
    ),
  );

  const paint = () => {
    preview.style.setProperty('--c-primary', primary);
    preview.style.setProperty('--c-primary-ink', readableInk(primary));
    preview.style.setProperty('--c-accent', accent);
    preview.style.setProperty('--c-accent-ink', readableInk(accent));
    primaryInput.value = primary;
    accentInput.value = accent;
  };
  paint();

  primaryInput.addEventListener('input', () => {
    primary = primaryInput.value;
    paint();
  });
  accentInput.addEventListener('input', () => {
    accent = accentInput.value;
    paint();
  });

  const presets = h(
    'div',
    { class: 'presets' },
    THEME_PRESETS.map((preset) =>
      h(
        'button',
        {
          type: 'button',
          class: 'preset',
          onClick: () => {
            primary = preset.primary;
            accent = preset.accent;
            paint();
          },
        },
        h('span', { class: 'preset__swatch', style: { background: `linear-gradient(135deg, ${preset.primary} 55%, ${preset.accent} 55%)` } }),
        preset.name,
      ),
    ),
  );

  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Salvar cores');

  const form = h(
    'form',
    {
      class: 'stack',
      onSubmit: (event) => {
        event.preventDefault();
        return withBusy(submit, async () => {
          const saved = await ctx.commit(
            (draft) => {
              draft.theme = { primary, accent };
            },
            { message: 'Cores salvas.' },
          );
          if (saved) applyTheme(ctx.store.theme);
        });
      },
    },
    panel('Combinações prontas', presets),
    panel('Personalizar', h('div', { class: 'grid-2' }, field('Cor principal', primaryInput, { hint: 'Topo, botões e preços.' }), field('Cor de destaque', accentInput, { hint: 'Selos e detalhes.' }))),
    panel('Como fica', preview),
    h('div', { class: 'actions actions--sticky' }, submit),
  );

  container.replaceChildren(pageHeader('Cores', 'Combine o cardápio com a marca da sua loja.'), form);
}
