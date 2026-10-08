/** Escolhe o driver de dados (Firebase, servidor Node ou navegador). */
import { CONFIG } from '../config.js';
import { createApiDriver } from './api-driver.js';
import { createLocalDriver } from './local-driver.js';
import { FIREBASE_CONFIG } from '../firebase-config.js';
import { createFirebaseDriver } from './firebase-driver.js';
import { isFirebaseConfigured } from './firebase/index.js';

const rememberedKey = `${CONFIG.storageNamespace}:driver`;

/**
 * 'online'  -> o servidor respondeu e é a nossa API
 * 'static'  -> respondeu, mas é uma hospedagem estática (sem API)
 * 'offline' -> sem rede
 */
async function probeApi() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${CONFIG.apiBase}/health`, { cache: 'no-store', signal: controller.signal });
    const data = response.ok ? await response.json().catch(() => null) : null;
    return data?.app === 'cardapio-saas' ? 'online' : 'static';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

async function pickDriver() {
  if (CONFIG.driver === 'local') return createLocalDriver();
  if (CONFIG.driver === 'api') return createApiDriver();
  if (CONFIG.driver === 'firebase') return createFirebaseDriver();

  // Firebase preenchido em firebase-config.js tem prioridade: dispensa servidor.
  if (isFirebaseConfigured(FIREBASE_CONFIG)) return createFirebaseDriver();

  const state = await probeApi();
  if (state === 'online') {
    localStorage.setItem(rememberedKey, 'api');
    return createApiDriver();
  }
  // Sem rede num PWA que já usou o servidor: continua no modo servidor (cache).
  if (state === 'offline' && localStorage.getItem(rememberedKey) === 'api') return createApiDriver();

  localStorage.removeItem(rememberedKey);
  return createLocalDriver();
}

let driverPromise;
export const getDriver = () => (driverPromise ??= pickDriver());
