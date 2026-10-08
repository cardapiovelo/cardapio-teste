/** Erros do Firebase traduzidos para mensagens que o dono da loja entende. */

export class FirebaseError extends Error {
  /**
   * @param {string} message texto para mostrar na tela
   * @param {number} [status] status HTTP (0 = sem conexão)
   * @param {string} [code] código bruto do Firebase, ex.: EMAIL_EXISTS
   */
  constructor(message, status = 0, code = '') {
    super(message);
    this.name = 'FirebaseError';
    this.status = status;
    this.code = code;
  }
}

const WRONG_LOGIN = 'E-mail ou senha incorretos.';

const AUTH_MESSAGES = {
  EMAIL_NOT_FOUND: WRONG_LOGIN,
  INVALID_PASSWORD: WRONG_LOGIN,
  INVALID_LOGIN_CREDENTIALS: WRONG_LOGIN,
  USER_DISABLED: 'Esta conta foi desativada.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  EMAIL_EXISTS: 'Já existe uma conta com esse e-mail.',
  WEAK_PASSWORD: 'A senha é fraca demais. Use pelo menos 8 caracteres.',
  INVALID_EMAIL: 'Esse e-mail não parece válido.',
  MISSING_EMAIL: 'Informe o e-mail.',
  OPERATION_NOT_ALLOWED: 'O login por e-mail e senha não está ativado no Firebase.',
  PASSWORD_LOGIN_DISABLED: 'O login por e-mail e senha não está ativado no Firebase (Authentication > Sign-in method > E-mail/senha).',
  CONFIGURATION_NOT_FOUND: 'O Authentication ainda não foi iniciado neste projeto Firebase (Authentication > Vamos começar).',
  MISSING_PASSWORD: 'Informe a senha.',
  ADMIN_ONLY_OPERATION: 'O Firebase bloqueou criar contas por aqui. Verifique se o login por e-mail e senha está ativado.',
  INVALID_ID_TOKEN: 'Sua sessão expirou. Entre de novo.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Entre de novo.',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'Por segurança, entre de novo para continuar.',
  INVALID_REFRESH_TOKEN: 'Sua sessão expirou. Entre de novo.',
  USER_NOT_FOUND: 'Sua sessão expirou. Entre de novo.',
};

const HTTP_MESSAGES = {
  401: 'Sua sessão expirou. Entre de novo.',
  403: 'Sem permissão para fazer isso.',
  404: 'Não encontrado.',
  409: 'Já existe um item com esse endereço.',
  429: 'Muitas solicitações. Aguarde um pouco.',
};

/** O Firebase manda "WEAK_PASSWORD : texto em inglês"; só o código interessa. */
const codeOf = (message = '') => String(message).split(/\s*:\s*/)[0].trim();

/** Monta o erro a partir da resposta de erro do Google. */
export function errorFromResponse(status, body) {
  const raw = body?.error?.message ?? '';
  const code = AUTH_MESSAGES[codeOf(raw)] ? codeOf(raw) : body?.error?.status || codeOf(raw);
  const message =
    AUTH_MESSAGES[codeOf(raw)] ??
    (/API key not valid|API_KEY/i.test(raw) ? 'A chave do Firebase (apiKey) em firebase-config.js não é válida.' : null) ??
    HTTP_MESSAGES[status] ??
    `Erro ${status} ao falar com o Firebase${code ? ` (${code})` : ''}.`;
  return new FirebaseError(message, status, code);
}

export const offlineError = () => new FirebaseError('Sem conexão com a internet.', 0, 'OFFLINE');
