import { h } from '../../core/dom.js';

/**
 * Chips de categoria (rolagem horizontal).
 * @returns {{ setActive: (sectionId: string) => void }}
 */
export function renderCategoryNav(root, sections, { onSelect }) {
  root.replaceChildren();
  root.hidden = sections.length === 0;
  if (!sections.length) return { setActive() {} };

  const buttons = new Map();
  const list = h(
    'ul',
    { class: 'chips' },
    sections.map((section) => {
      const button = h('button', { type: 'button', class: 'chip', onClick: () => onSelect(section.id) }, section.title);
      buttons.set(section.id, button);
      return h('li', {}, button);
    }),
  );
  root.append(list);

  return {
    setActive(sectionId) {
      for (const [id, button] of buttons) {
        const active = id === sectionId;
        button.classList.toggle('is-active', active);
        if (active) {
          button.setAttribute('aria-current', 'true');
          list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.clientWidth) / 2, behavior: 'smooth' });
        } else {
          button.removeAttribute('aria-current');
        }
      }
    },
  };
}

/**
 * Avisa qual seção está sob o topo da tela enquanto o cliente rola.
 * @returns {() => void} função para parar de observar
 */
export function observeSections(container, onChange) {
  const sections = [...container.querySelectorAll('.menu-section')];
  if (!sections.length || !('IntersectionObserver' in window)) return () => {};

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      const first = sections.find((section) => visible.has(section));
      if (first) onChange(first.dataset.section);
    },
    { rootMargin: '-96px 0px -65% 0px' },
  );
  sections.forEach((section) => observer.observe(section));
  return () => observer.disconnect();
}
