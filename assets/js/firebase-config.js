/**
 * Configuração do seu projeto Firebase (veja docs/FIREBASE.md).
 * Estes valores NÃO são segredos: quem protege os dados são as regras do Firestore.
 * Com apiKey e projectId preenchidos, o app usa o Firebase automaticamente
 * (login por e-mail no painel e dados na nuvem).
 */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyDaUvRI4AMy_7OGUOdJW74Qy5080LdlnrA',
  projectId: 'cardapiovelo-fc7cf',

  /** Só para testes ou emulador: troca os endereços do Google. Deixe null. */
  endpoints: null,
});
