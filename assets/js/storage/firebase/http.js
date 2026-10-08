/** Uma única função de requisição para todo o Firebase (facilita testar com um servidor falso). */
import { errorFromResponse, FirebaseError, offlineError } from './errors.js';

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {(url: string, options?: { method?: string, json?: object, form?: object, token?: string }) => Promise<any>}
 */
export function createRequest(fetchImpl = (...args) => fetch(...args)) {
  return async function request(url, { method = 'GET', json, form, token } = {}) {
    const headers = {};
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetchImpl(url, { method, headers, body, cache: 'no-store' });
    } catch {
      throw offlineError();
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) throw errorFromResponse(response.status, data);
    if (data === null && response.status !== 204) throw new FirebaseError('Resposta inesperada do Firebase.', response.status);
    return data ?? {};
  };
}
