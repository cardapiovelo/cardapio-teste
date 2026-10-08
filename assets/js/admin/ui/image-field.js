import { CONFIG } from '../../config.js';
import { h } from '../../core/dom.js';
import { resizeImage } from '../../core/image.js';
import { safeUrl } from '../../core/utils.js';
import { icon } from '../../ui/icons.js';

/**
 * Campo de imagem: escolhe, reduz no navegador e envia pelo driver.
 * @returns {{ el: HTMLElement, get: () => string, set: (url: string) => void }}
 */
export function imageField({ ctx, label, value = '', maxSize, keepTransparency = false, shape = 'square' }) {
  let current = value;
  const preview = h('div', { class: ['image-field__preview', `is-${shape}`] });
  const status = h('small', { class: 'field__hint', role: 'status' });
  const removeButton = h('button', { type: 'button', class: 'link-btn link-btn--danger', onClick: () => set('') }, 'Remover');
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', onChange: handleFile });
  const pickButton = h('button', { type: 'button', class: 'btn btn--soft btn--small', onClick: () => fileInput.click() }, icon('upload', { size: 16 }), 'Escolher imagem');

  function draw() {
    const src = safeUrl(current);
    preview.replaceChildren(src ? h('img', { src, alt: '' }) : icon('image', { size: 28 }));
    removeButton.hidden = !current;
  }

  function set(url) {
    current = url;
    draw();
  }

  async function handleFile() {
    const file = fileInput.files?.[0];
    if (!file) return;
    pickButton.disabled = true;
    status.textContent = 'Enviando a imagem';
    try {
      // Alguns drivers (Firebase) pedem fotos menores para o cardápio caber no limite.
      const { scale = 1, quality = CONFIG.image.quality } = ctx.driver.imageLimits ?? {};
      const size = Math.round((maxSize ?? CONFIG.image.product) * scale);
      const blob = await resizeImage(file, { maxSize: size, quality, keepTransparency });
      set(await ctx.driver.uploadImage(ctx.slug, blob));
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      pickButton.disabled = false;
      fileInput.value = '';
    }
  }

  draw();
  const el = h(
    'div',
    { class: 'image-field' },
    h('span', { class: 'field__label' }, label),
    h('div', { class: 'image-field__row' }, preview, h('div', { class: 'image-field__actions' }, pickButton, removeButton, fileInput, status)),
  );
  return { el, get: () => current, set };
}
