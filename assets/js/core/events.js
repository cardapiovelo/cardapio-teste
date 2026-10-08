/** Emissor de eventos mínimo (observer). */
export function createEmitter() {
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(payload) {
      for (const listener of [...listeners]) listener(payload);
    },
  };
}
