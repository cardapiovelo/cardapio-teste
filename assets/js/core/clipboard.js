/**
 * Copia um texto. Usa a API moderna (só existe em HTTPS ou localhost) e,
 * quando ela não está disponível (ex.: http://192.168.x.x), cai para o
 * método antigo com um campo de texto temporário.
 * @param {string} text
 * @returns {Promise<boolean>} true se copiou
 */
export async function copyText(text) {
  try {
    if (globalThis.navigator?.clipboard && globalThis.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* segue para o método antigo */
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
  document.body.append(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
