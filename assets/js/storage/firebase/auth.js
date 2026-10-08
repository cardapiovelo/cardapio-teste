/** Firebase Authentication (e-mail e senha) pela API REST, sem SDK. */

const DEFAULT_IDENTITY = 'https://identitytoolkit.googleapis.com/v1';
const DEFAULT_TOKEN = 'https://securetoken.googleapis.com/v1/token';

/**
 * @typedef {{ idToken: string, refreshToken: string, uid: string, email: string, expiresAt: number }} AuthSession
 */

const toSession = ({ idToken, refreshToken, expiresIn, localId, email }) => ({
  idToken,
  refreshToken,
  uid: localId,
  email: email ?? '',
  expiresAt: Date.now() + Number(expiresIn || 3600) * 1000,
});

export function createAuthApi({ apiKey, request, endpoints = {} }) {
  const identity = endpoints.identity ?? DEFAULT_IDENTITY;
  const tokenUrl = endpoints.secureToken ?? DEFAULT_TOKEN;
  const identityCall = (action, json) => request(`${identity}/accounts:${action}?key=${encodeURIComponent(apiKey)}`, { method: 'POST', json });

  return {
    /** @returns {Promise<AuthSession>} */
    async signIn(email, password) {
      return toSession(await identityCall('signInWithPassword', { email, password, returnSecureToken: true }));
    },

    /** Cria uma conta (usado pelo administrador para criar o acesso do cliente). */
    async signUp(email, password) {
      return toSession(await identityCall('signUp', { email, password, returnSecureToken: true }));
    },

    /** Troca o refreshToken por um idToken novo. O e-mail vem do que já sabemos. */
    async refresh(session) {
      const data = await request(`${tokenUrl}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        form: { grant_type: 'refresh_token', refresh_token: session.refreshToken },
      });
      return {
        ...session,
        idToken: data.id_token,
        refreshToken: data.refresh_token ?? session.refreshToken,
        uid: data.user_id ?? session.uid,
        expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
      };
    },

    async changePassword(idToken, password) {
      await identityCall('update', { idToken, password, returnSecureToken: false });
    },

    /** Manda o e-mail de "redefinir senha" do próprio Firebase. */
    async sendPasswordReset(email) {
      await identityCall('sendOobCode', { requestType: 'PASSWORD_RESET', email });
    },
  };
}
