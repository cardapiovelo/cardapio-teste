/** Cloud Firestore pela API REST, sem SDK. Só os tipos de valor que o app usa. */

const DEFAULT_BASE = 'https://firestore.googleapis.com/v1';

/* ---------- conversão JS <-> formato do Firestore ---------- */

export function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
}

export function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

export const encodeFields = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));

export function decodeDocument(document) {
  const fields = Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeValue(value)]));
  return { id: String(document.name ?? '').split('/').pop(), ...fields };
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

export function createFirestoreApi({ projectId, request, endpoints = {} }) {
  const root = `${endpoints.firestore ?? DEFAULT_BASE}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;

  return {
    /** Lê um documento. Lança erro 404/403 se não existir ou não for permitido. */
    async get(path, token) {
      return decodeDocument(await request(`${root}/${encodePath(path)}`, { token }));
    },

    /** Cria um documento com id definido. Falha com 409 se já existir. */
    async create(collection, id, data, token) {
      const url = `${root}/${encodePath(collection)}?documentId=${encodeURIComponent(id)}`;
      return decodeDocument(await request(url, { method: 'POST', json: { fields: encodeFields(data) }, token }));
    },

    /** Atualiza só os campos informados; o documento precisa existir. */
    async update(path, data, token) {
      const mask = Object.keys(data).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`);
      const url = `${root}/${encodePath(path)}?${[...mask, 'currentDocument.exists=true'].join('&')}`;
      return decodeDocument(await request(url, { method: 'PATCH', json: { fields: encodeFields(data) }, token }));
    },

    /**
     * Grava vários documentos de uma vez (tudo ou nada). Cada item: { path, data }.
     * Falha com 409 se algum já existir, e as regras podem olhar o conjunto todo.
     */
    async commit(writes, token) {
      const name = (path) => `projects/${projectId}/databases/(default)/documents/${path}`;
      const body = {
        writes: writes.map(({ path, data }) => ({ update: { name: name(path), fields: encodeFields(data) }, currentDocument: { exists: false } })),
      };
      await request(`${root}:commit`, { method: 'POST', json: body, token });
    },

    async remove(path, token) {
      await request(`${root}/${encodePath(path)}`, { method: 'DELETE', token });
    },

    /**
     * Consulta simples numa coleção.
     * @param {string} collection
     * @param {{ where?: Array<{ field: string, value: any }>, select?: string[], limit?: number }} [query]
     */
    async query(collection, { where = [], select, limit } = {}, token) {
      const structuredQuery = { from: [{ collectionId: collection }] };
      if (where.length) {
        const filters = where.map(({ field, value }) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encodeValue(value) } }));
        structuredQuery.where = filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
      }
      if (select) structuredQuery.select = { fields: select.map((fieldPath) => ({ fieldPath })) };
      if (limit) structuredQuery.limit = limit;

      const rows = await request(`${root}:runQuery`, { method: 'POST', json: { structuredQuery }, token });
      return (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => decodeDocument(row.document));
    },
  };
}
