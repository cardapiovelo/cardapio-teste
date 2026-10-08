import { h } from '../../core/dom.js';
import { plural, uid } from '../../core/utils.js';
import { emptyState } from '../../ui/empty-state.js';
import { confirmDialog } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { btn, iconButton, pageHeader, panel, textInput, toggle } from '../ui/form.js';

export const id = 'categorias';
export const label = 'Categorias';
export const iconName = 'list';

export function render(container, ctx) {
  const { categories, products } = ctx.store;
  const countIn = (categoryId) => products.filter((product) => product.categoryId === categoryId).length;

  const change = async (mutator, message) => {
    if (await ctx.commit(mutator, { message })) ctx.refresh();
  };

  const move = (index, step) =>
    change((draft) => {
      const target = index + step;
      [draft.categories[index], draft.categories[target]] = [draft.categories[target], draft.categories[index]];
    }, '');

  const remove = async (category) => {
    const total = countIn(category.id);
    const ok = await confirmDialog({
      title: `Excluir "${category.name}"?`,
      message: total
        ? `Os ${total} ${plural(total, 'produto', 'produtos')} dessa categoria também serão excluídos. Para só esconder, use o interruptor.`
        : 'Essa categoria não tem produtos.',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (ok) {
      await change((draft) => {
        draft.categories = draft.categories.filter((item) => item.id !== category.id);
        draft.products = draft.products.filter((product) => product.categoryId !== category.id);
      }, 'Categoria excluída.');
    }
  };

  const rows = categories.map((category, index) => {
    const name = textInput({ value: category.name, maxlength: 60, 'aria-label': 'Nome da categoria' });
    name.addEventListener('change', () => {
      const value = name.value.trim();
      if (!value) {
        name.value = category.name;
        return toast('O nome não pode ficar vazio.', { type: 'error' });
      }
      return change((draft) => (draft.categories[index].name = value), 'Nome atualizado.');
    });
    const active = toggle({
      checked: category.active,
      label: 'Visível',
      onChange: (value) => change((draft) => (draft.categories[index].active = value), value ? 'Categoria visível.' : 'Categoria escondida.'),
    });
    const total = countIn(category.id);
    return h(
      'li',
      { class: 'item-card' },
      h('div', { class: 'item-card__head' }, name),
      h(
        'div',
        { class: 'item-card__foot' },
        active.el,
        h('span', { class: 'muted' }, `${total} ${plural(total, 'produto', 'produtos')}`),
        h(
          'div',
          { class: 'item-card__tools' },
          iconButton('arrow-up', 'Subir', () => move(index, -1), { disabled: index === 0 }),
          iconButton('arrow-down', 'Descer', () => move(index, 1), { disabled: index === categories.length - 1 }),
          iconButton('trash', 'Excluir categoria', () => remove(category), { danger: true }),
        ),
      ),
    );
  });

  const newName = textInput({ maxlength: 60, placeholder: 'Ex.: Sobremesas', 'aria-label': 'Nome da nova categoria' });
  const addForm = h(
    'form',
    {
      class: 'inline-form',
      onSubmit: (event) => {
        event.preventDefault();
        const value = newName.value.trim();
        if (!value) return toast('Digite o nome da categoria.', { type: 'error' });
        return change((draft) => draft.categories.push({ id: uid('cat'), name: value, active: true }), 'Categoria criada.');
      },
    },
    newName,
    btn('Adicionar', { variant: 'primary', type: 'submit', iconName: 'plus', size: 'small' }),
  );

  container.replaceChildren(
    pageHeader('Categorias', 'A ordem aqui é a ordem no cardápio.'),
    panel('Nova categoria', addForm),
    categories.length
      ? panel('Suas categorias', h('ul', { class: 'stack-list' }, rows))
      : emptyState({ iconName: 'list', title: 'Nenhuma categoria ainda', text: 'Crie a primeira acima, como "Açaí" ou "Bebidas". Depois você cadastra os produtos dentro dela.' }),
  );
}
