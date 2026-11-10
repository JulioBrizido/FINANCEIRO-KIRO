/**
 * db-adapter.js — detecta o ambiente e carrega a camada de dados correta.
 *
 *   Electron (desktop) → db.js (IndexedDB), sem autenticação
 *   Navegador (web)    → js/auth.js + js/api.js (HTTP + JWT)
 *
 * As funções globais (dbGetAll, dbAdd, contasGetAll, etc.) ficam
 * disponíveis em ambos os modos com a mesma assinatura, então os
 * controllers (lancamentos.js, dashboard.js, config.js) não mudam.
 *
 * Deve ser o PRIMEIRO script carregado em cada página, antes dos
 * controllers. Usa document.write para inserção síncrona durante
 * o parsing da página.
 */

(function () {
  // Detecta Electron: preload.js expõe window.appVersion;
  // o user agent do Electron também contém a string "Electron"
  var isElectron = !!window.appVersion ||
                   navigator.userAgent.indexOf('Electron') !== -1;

  if (isElectron) {
    // ── MODO DESKTOP ──────────────────────────────────────────────────
    // Sem autenticação, usa IndexedDB (db.js).
    // Define no-ops para as funções de auth que os controllers chamam.
    window.requireAuth   = function () { return true; };
    window.updateNavUser = function () {};
    window.logout        = function () {};

    document.write('<script src="db.js"><\/script>');
  } else {
    // ── MODO WEB ─────────────────────────────────────────────────────
    // Autenticação JWT + API HTTP.
    document.write('<script src="js/auth.js"><\/script>');
    document.write('<script>requireAuth();<\/script>');
    document.write('<script src="js/api.js"><\/script>');
  }
})();
