/**
 * db-adapter.js — detecta o ambiente e ativa a camada de dados correta.
 *
 * ESTRATÉGIA: Todos os scripts (db.js, auth.js, api.js) são carregados via
 * <script> estático no HTML. Este arquivo apenas detecta o ambiente e:
 *   - No Electron: define no-ops para requireAuth/updateNavUser/logout
 *                  e expõe window.__useElectron = true
 *   - No browser:  chama requireAuth() (redireciona para login se sem token)
 *
 * Os controllers (lancamentos.js, dashboard.js, etc.) chamam as funções
 * globais (dbGetAll, contasGetAll, configGet, etc.) que são definidas
 * em db.js (IndexedDB, Electron) ou api.js (HTTP, web) — ambos carregados
 * estaticamente. O browser só executa o bloco relevante pela detecção.
 */

(function () {
  var isElectron = typeof window.appVersion !== 'undefined' ||
                   navigator.userAgent.indexOf('Electron') !== -1;

  window.__isElectron = isElectron;

  if (isElectron) {
    // Modo desktop: define stubs de autenticação
    window.requireAuth   = function () { return true; };
    window.updateNavUser = function () {};
    window.logout        = function () {};
  } else {
    // Modo web: chama requireAuth que está em auth.js (já carregado antes deste script)
    if (typeof requireAuth === 'function') requireAuth();
  }
})();
