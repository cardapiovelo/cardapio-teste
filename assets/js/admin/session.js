/** Sessão do painel: guarda a loja em edição e salva as mudanças. */
import { createEmitter } from '../core/events.js';
import { normalizeStore } from '../domain/schema.js';
import { toast } from '../ui/toast.js';

export function createSession({ slug, driver, store, onAuthLost }) {
  let current = store;
  const emitter = createEmitter();

  return {
    slug,
    driver,
    subscribe: emitter.subscribe,

    get store() {
      return current;
    },

    /**
     * Aplica a mudança numa cópia, valida, salva e só então troca a loja atual.
     * Se salvar falhar, nada muda na tela.
     * @returns {Promise<boolean>} true se salvou
     */
    async commit(mutator, { message = 'Alterações salvas.' } = {}) {
      const draft = structuredClone(current);
      mutator(draft);
      const next = normalizeStore({ ...draft, slug });
      try {
        await driver.save(slug, next);
      } catch (error) {
        if (error.status === 401) {
          onAuthLost();
          return false;
        }
        toast(error.message || 'Não foi possível salvar.', { type: 'error' });
        return false;
      }
      current = next;
      emitter.emit(next);
      if (message) toast(message, { type: 'success' });
      return true;
    },
  };
}
