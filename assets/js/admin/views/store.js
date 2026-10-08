import { CONFIG } from '../../config.js';
import { h } from '../../core/dom.js';
import { maskPhoneInput, formatPhoneBR } from '../../core/utils.js';
import { toast } from '../../ui/toast.js';
import { imageField } from '../ui/image-field.js';
import { field, pageHeader, panel, textArea, textInput, withBusy } from '../ui/form.js';

export const id = 'loja';
export const label = 'Dados da loja';
export const iconName = 'store';

export function render(container, ctx) {
  const { profile } = ctx.store;
  const { address } = profile;

  const logo = imageField({ ctx, label: 'Logo', value: profile.logo, maxSize: CONFIG.image.logo, keepTransparency: true, shape: 'round' });
  const cover = imageField({ ctx, label: 'Imagem de capa', value: profile.cover, maxSize: CONFIG.image.cover, shape: 'wide' });

  const name = textInput({ value: profile.name, maxlength: 80, required: true });
  const tagline = textInput({ value: profile.tagline, maxlength: 120, placeholder: 'Ex.: Açaí e sorvete artesanal' });
  const about = textArea({ value: profile.about, rows: 4, maxlength: 1200, placeholder: 'Conte a história da loja, os diferenciais, o que os clientes precisam saber.' });
  const whatsapp = textInput({ value: formatPhoneBR(profile.whatsapp), type: 'tel', inputmode: 'tel', placeholder: '(00) 00000-0000' });
  const instagram = textInput({ value: profile.instagram, maxlength: 40, placeholder: 'usuario', autocapitalize: 'none' });
  const street = textInput({ value: address.street, maxlength: 120 });
  const number = textInput({ value: address.number, maxlength: 12 });
  const complement = textInput({ value: address.complement, maxlength: 60 });
  const district = textInput({ value: address.district, maxlength: 60 });
  const city = textInput({ value: address.city, maxlength: 60 });
  const state = textInput({ value: address.state, maxlength: 2, placeholder: 'SP' });

  whatsapp.addEventListener('input', () => {
    whatsapp.value = maskPhoneInput(whatsapp.value);
  });

  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Salvar dados');

  const form = h(
    'form',
    {
      class: 'stack',
      novalidate: true,
      onSubmit: (event) => {
        event.preventDefault();
        if (name.value.trim().length < 2) return toast('Informe o nome da loja.', { type: 'error' });
        return withBusy(submit, () =>
          ctx.commit(
            (draft) => {
              Object.assign(draft.profile, {
                name: name.value,
                tagline: tagline.value,
                about: about.value,
                whatsapp: whatsapp.value,
                instagram: instagram.value,
                logo: logo.get(),
                cover: cover.get(),
              });
              draft.profile.address = {
                street: street.value,
                number: number.value,
                complement: complement.value,
                district: district.value,
                city: city.value,
                state: state.value,
              };
            },
            { message: 'Dados da loja salvos.' },
          ),
        );
      },
    },
    panel('Identidade', h('div', { class: 'grid-2' }, logo.el, cover.el), field('Nome da loja', name), field('Frase curta', tagline), field('Sobre a loja', about)),
    panel(
      'Contato',
      field('WhatsApp que recebe os pedidos', whatsapp, { hint: 'Com DDD. Os pedidos chegam nesse número.' }),
      field('Instagram', instagram, { hint: 'Só o nome de usuário, sem @.' }),
    ),
    panel(
      'Endereço',
      field('Rua ou avenida', street),
      h('div', { class: 'grid-2' }, field('Número', number), field('Complemento', complement)),
      field('Bairro', district),
      h('div', { class: 'grid-2' }, field('Cidade', city), field('Estado (sigla)', state)),
    ),
    h('div', { class: 'actions actions--sticky' }, submit),
  );

  container.replaceChildren(pageHeader('Dados da loja', 'Nome, logo, contato e endereço que aparecem no cardápio.'), form);
}
