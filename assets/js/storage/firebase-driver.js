/**
 * Driver "firebase": login por e-mail (Firebase Authentication) e lojas no Cloud Firestore.
 * Funciona em hospedagem só de arquivos (GitHub Pages, Netlify...), sem servidor.
 *
 * Modelo no Firestore (regras em firebase/firestore.rules):
 *   admins/{uid}   -> existe = esta pessoa administra a plataforma (você)
 *   stores/{slug}  -> { ownerUid, ownerEmail, active, name, data (JSON do cardápio), updatedAt }
 *
 * Quem pode o quê:
 *   - qualquer pessoa lê uma loja ativa (é o cardápio público);
 *   - o dono edita o cardápio da própria loja;
 *   - só o administrador cria, ativa/desativa e exclui lojas.
 */
import { CONFIG } from '../config.js';
import { blobToDataUrl } from '../core/image.js';
import { createStarterStore } from '../domain/demo-data.js';
import { createDefaultStore, normalizeStore } from '../domain/schema.js';
import { FIREBASE_CONFIG } from '../firebase-config.js';
import { FirebaseError } from './firebase/errors.js';
import { createFirebaseClient, isFirebaseConfigured } from './firebase/index.js';

/** Limite do Firestore é 1 MB por documento; deixamos folga. */
export const MAX_STORE_BYTES = 900_000;

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
/** Tira espaços e pontuação que vêm junto ao copiar o código de uma frase (ex.: o ponto final). */
const cleanCode = (code) => String(code).trim().replace(/^["'`“”‘’(]+|["'`“”‘’).,;:!]+$/g, '').trim();
const byteLength = (text) => new TextEncoder().encode(text).length;

/**
 * @param {{ config?: object, fetchImpl?: typeof fetch, storage?: Storage }} [options]
 */
export function createFirebaseDriver({ config = FIREBASE_CONFIG, fetchImpl, storage = globalThis.localStorage } = {}) {
  if (!isFirebaseConfigured(config)) {
    throw new Error('Firebase sem configuração: preencha apiKey e projectId em assets/js/firebase-config.js.');
  }
  const { auth, db } = createFirebaseClient(config, fetchImpl);
  const ns = CONFIG.storageNamespace;
  const sessionKey = `${ns}:fb-session`;
  const cacheKey = (slug) => `${ns}:cache:${slug}`;

  /* ---------- sessão guardada no aparelho ---------- */
  const readSession = () => {
    try {
      const saved = JSON.parse(storage.getItem(sessionKey) ?? 'null');
      return saved?.refreshToken ? saved : null;
    } catch {
      return null;
    }
  };
  const writeSession = (session) => storage.setItem(sessionKey, JSON.stringify(session));
  const clearSession = () => storage.removeItem(sessionKey);

  const expired = () => new FirebaseError('Sua sessão expirou. Entre de novo.', 401, 'SESSION_EXPIRED');

  /** idToken válido; renova sozinho quando está perto de vencer (ou quando `force`). */
  async function freshToken({ force = false } = {}) {
    let session = readSession();
    if (!session) throw expired();
    if (force || session.expiresAt - 60_000 <= Date.now()) {
      try {
        session = await auth.refresh(session);
      } catch (error) {
        if (error.status === 0) throw error;
        clearSession();
        throw expired();
      }
      writeSession(session);
    }
    return session.idToken;
  }

  /** Roda a chamada com token. Se o Firebase recusar o token (relógio errado, senha trocada), renova uma vez e repete. */
  async function withToken(call) {
    try {
      return await call(await freshToken());
    } catch (error) {
      if (error.status !== 401) throw error;
      try {
        return await call(await freshToken({ force: true }));
      } catch (retry) {
        if (retry.status === 401) clearSession();
        throw retry;
      }
    }
  }

  const parseStore = (doc, slug) => {
    try {
      return normalizeStore({ ...JSON.parse(doc.data), slug });
    } catch {
      throw new FirebaseError('Os dados desta loja estão corrompidos. Restaure um backup.', 500);
    }
  };

  const remember = (slug, doc) => {
    try {
      storage.setItem(cacheKey(slug), JSON.stringify({ data: doc.data }));
    } catch {
      /* cache cheio: segue sem ele */
    }
  };

  const fromCache = (slug) => {
    try {
      const cached = JSON.parse(storage.getItem(cacheKey(slug)) ?? 'null');
      return cached?.data ? parseStore(cached, slug) : null;
    } catch {
      return null;
    }
  };

  /** Lê a loja como visitante; se for proibido e houver sessão, tenta como dono/admin. */
  async function readDoc(slug) {
    try {
      return await db.get(`stores/${slug}`);
    } catch (error) {
      if (error.status === 403 && readSession()) {
        try {
          return await withToken((token) => db.get(`stores/${slug}`, token));
        } catch (retry) {
          if (retry.status === 0) throw retry;
          // Sessão vencida ou sem permissão: para quem lê, é só uma loja indisponível.
        }
      }
      throw error;
    }
  }

  const assertAdmin = () => {
    if (!readSession()?.isAdmin) throw new FirebaseError('Só o administrador pode fazer isso.', 403);
  };

  return {
    name: 'firebase',
    requiresAuth: true,
    /** O login é por e-mail (e a loja vem da conta), não por endereço da loja. */
    authMode: 'email',
    /** Fotos menores: o cardápio inteiro precisa caber num documento de 1 MB. */
    imageLimits: Object.freeze({ scale: 0.6, quality: 0.7 }),
    maxStoreBytes: MAX_STORE_BYTES,

    /* ---------- cardápio ---------- */
    async load(slug) {
      try {
        const doc = await readDoc(slug);
        remember(slug, doc);
        return parseStore(doc, slug);
      } catch (error) {
        if (error.status === 404 || error.status === 403) {
          storage.removeItem(cacheKey(slug));
          return null;
        }
        if (error.status === 0) {
          const cached = fromCache(slug);
          if (cached) return cached;
        }
        throw error;
      }
    },

    async save(slug, store) {
      const data = JSON.stringify(store);
      const bytes = byteLength(data);
      if (bytes > MAX_STORE_BYTES) {
        throw new FirebaseError(`O cardápio passou do limite (${kb(bytes)} de ${kb(MAX_STORE_BYTES)}). Use fotos menores ou remova algumas.`, 413);
      }
      await withToken((token) => db.update(`stores/${slug}`, { data, name: store.profile.name, updatedAt: Date.now() }, token));
      remember(slug, { data });
    },

    /** Quanto do espaço do cardápio já foi usado. */
    usage(store) {
      const bytes = byteLength(JSON.stringify(store));
      return { bytes, limit: MAX_STORE_BYTES, ratio: bytes / MAX_STORE_BYTES };
    },

    /** Fotos viram texto (data URL) dentro do próprio cardápio. */
    async uploadImage(_slug, blob) {
      return blobToDataUrl(blob);
    },

    /* ---------- sessão ---------- */
    isAuthenticated: () => Boolean(readSession()),

    currentUser() {
      const session = readSession();
      return session ? { uid: session.uid, email: session.email, isAdmin: Boolean(session.isAdmin), slug: session.slug ?? '' } : null;
    },

    async login(email, password) {
      const session = await auth.signIn(String(email).trim().toLowerCase(), password);

      // Existir o documento admins/{uid} é o que faz alguém ser administrador.
      let isAdmin = false;
      try {
        await db.get(`admins/${session.uid}`, session.idToken);
        isAdmin = true;
      } catch (error) {
        if (error.status === 0) throw error;
      }

      let slug = '';
      if (!isAdmin) {
        const [mine] = await db.query('stores', { where: [{ field: 'ownerUid', value: session.uid }], select: ['name', 'active'], limit: 1 }, session.idToken);
        if (!mine) throw new FirebaseError(`Sua conta ainda não tem uma loja. Se você é o administrador, falta criar no Firestore o documento admins/${session.uid} (o UID é este). Se é cliente, fale com quem te enviou o app.`, 403);
        slug = mine.id;
      }
      writeSession({ ...session, isAdmin, slug });
    },

    logout() {
      clearSession();
    },

    /**
     * Primeiro acesso: cria a conta (ou usa a que você já criou no console) e registra
     * essa conta como administradora. Só funciona uma vez e só com o código de instalação
     * que você colocou nas regras do Firestore (firebase/firestore.rules).
     */
    async setupAdmin({ email, password, code }) {
      const address = String(email).trim().toLowerCase();
      let session;
      try {
        session = await auth.signUp(address, password);
      } catch (error) {
        if (error.code !== 'EMAIL_EXISTS') throw error;
        session = await auth.signIn(address, password); // a conta já existe: confirma a senha
      }
      try {
        await db.commit(
          [
            { path: 'meta/setup', data: { code: cleanCode(code), adminUid: session.uid, createdAt: Date.now() } },
            { path: `admins/${session.uid}`, data: { admin: true, email: address } },
          ],
          session.idToken,
        );
      } catch (error) {
        if (error.status === 403 || error.status === 409) {
          throw new FirebaseError('Não deu para concluir: o código de instalação está errado ou o administrador já foi criado. Se já foi criado, volte e entre normalmente.', 403);
        }
        throw error;
      }
      await this.login(address, password);
    },

    async changePassword(_slug, current, next) {
      const session = readSession();
      if (!session) throw expired();
      // Entrar de novo com a senha atual confirma que quem pede é o dono da conta.
      let confirmed;
      try {
        confirmed = await auth.signIn(session.email, current);
      } catch (error) {
        if (error.status === 400) throw new FirebaseError('A senha atual está incorreta.', 403);
        throw error;
      }
      await auth.changePassword(confirmed.idToken, next);
      writeSession({ ...session, ...confirmed, isAdmin: session.isAdmin, slug: session.slug });
    },

    /** "Esqueci a senha": o Firebase manda o e-mail de redefinição. */
    async sendPasswordReset(email) {
      await auth.sendPasswordReset(String(email).trim().toLowerCase());
    },

    async create() {
      throw new FirebaseError('Neste modo as lojas são criadas pelo administrador.', 403);
    },

    /* ---------- administração da plataforma (só administrador) ---------- */
    platform: {
      async listStores() {
        assertAdmin();
        const rows = await withToken((token) => db.query('stores', { select: ['name', 'active', 'ownerEmail', 'updatedAt'] }, token));
        return rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
      },

      /** Cria o acesso do dono e a loja dele. */
      async createStore({ name, slug, email, password, withExamples = true }) {
        assertAdmin();
        const ownerEmail = String(email).trim().toLowerCase();
        return withToken(async (token) => {
          const taken = await db.get(`stores/${slug}`, token).then(
            () => true,
            (error) => {
              if (error.status === 404) return false;
              throw error;
            },
          );
          if (taken) throw new FirebaseError('Esse endereço já está em uso por outra loja.', 409);

          const owner = await auth.signUp(ownerEmail, password);
          const store = withExamples ? createStarterStore({ slug, name }) : createDefaultStore({ slug, name });
          await db.create('stores', slug, { ownerUid: owner.uid, ownerEmail, active: true, name, data: JSON.stringify(store), updatedAt: Date.now() }, token);
          return { slug, ownerEmail };
        });
      },

      async setActive(slug, active) {
        assertAdmin();
        await withToken((token) => db.update(`stores/${slug}`, { active }, token));
      },

      async removeStore(slug) {
        assertAdmin();
        await withToken((token) => db.remove(`stores/${slug}`, token));
      },
    },
  };
}
