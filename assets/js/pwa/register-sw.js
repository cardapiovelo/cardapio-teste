/** Registra o service worker (precisa de HTTPS ou localhost). */
export async function registerServiceWorker(url = 'sw.js') {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(url);
  } catch (error) {
    console.warn('Service worker não registrado:', error);
    return null;
  }
}
