/**
 * Mini helper para criar elementos sem innerHTML.
 * Todo texto entra como textContent, então nomes/descrições vindos do painel
 * nunca são interpretados como HTML (protege contra XSS).
 *
 * h('button', { class: 'btn', onClick: fn }, 'Texto', outroNo)
 */
const PROPERTY_KEYS = new Set([
  'value', 'checked', 'disabled', 'selected', 'readOnly', 'multiple', 'required', 'hidden', 'open', 'indeterminate',
]);

function toNodes(list) {
  return list
    .flat(Infinity)
    .filter((child) => child !== null && child !== undefined && child !== false && child !== true)
    .map((child) => (child instanceof Node ? child : document.createTextNode(String(child))));
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    } else if (key === 'style') {
      if (typeof value === 'string') node.style.cssText = value;
      else {
        for (const [name, v] of Object.entries(value)) {
          if (name.startsWith('--')) node.style.setProperty(name, v);
          else node.style[name] = v;
        }
      }
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (PROPERTY_KEYS.has(key)) {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

export function h(tag, props, ...children) {
  const node = document.createElement(tag);
  const isProps = props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props);
  if (isProps) applyProps(node, props);
  else if (props !== undefined && props !== null) children.unshift(props);
  node.append(...toNodes(children));
  return node;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function render(root, ...children) {
  root.replaceChildren(...toNodes(children));
  return root;
}
