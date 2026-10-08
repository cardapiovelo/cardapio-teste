/** Junta Authentication e Firestore num cliente só. */
import { createAuthApi } from './auth.js';
import { createFirestoreApi } from './firestore.js';
import { createRequest } from './http.js';

/**
 * @param {{ apiKey: string, projectId: string, endpoints?: object | null }} config
 * @param {typeof fetch} [fetchImpl]
 */
export function createFirebaseClient(config, fetchImpl) {
  const request = createRequest(fetchImpl);
  const endpoints = config.endpoints ?? {};
  return {
    auth: createAuthApi({ apiKey: config.apiKey, request, endpoints }),
    db: createFirestoreApi({ projectId: config.projectId, request, endpoints }),
  };
}

export const isFirebaseConfigured = (config) => Boolean(config?.apiKey && config?.projectId);
