/**
 * api.js — camada de dados via HTTP (substitui db.js/IndexedDB no modo web).
 *
 * No modo Electron (window.__isElectron === true), este arquivo é carregado
 * mas NÃO sobrescreve as funções globais — o db.js (IndexedDB) já as definiu.
 *
 * Usa atribuição em window (não declarações function) para poder rodar dentro
 * de um bloco condicional sem erros de sintaxe em strict mode.
 *
 * Depende de: js/auth.js (para obter o token).
 */

(function () {
  // No Electron db.js já definiu tudo — não sobrescreve
  if (typeof window !== 'undefined' && window.__isElectron) return;

  // ── CLIENTE HTTP ────────────────────────────────────────────────────────

  async function _fetch(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = window._authToken || localStorage.getItem('ff_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const resp = await fetch(url, opts);

    if (resp.status === 401 && !url.includes('/api/auth/')) {
      localStorage.removeItem('ff_token');
      localStorage.removeItem('ff_user');
      window.location.href = 'login.html';
      throw new Error('Sessão expirada');
    }

    if (!resp.ok) {
      let msg = 'Erro na requisição';
      try { msg = (await resp.json()).error || msg; } catch { /* ignora */ }
      throw new Error(msg);
    }

    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  }

  // ── CRUD TRANSAÇÕES ──────────────────────────────────────────────────────

  window.dbGetAll = async function () {
    return _fetch('GET', '/api/transacoes');
  };

  window.dbAdd = async function (transacao) {
    const r = await _fetch('POST', '/api/transacoes', transacao);
    return r.id;
  };

  window.dbUpdate = async function (transacao) {
    return _fetch('PUT', '/api/transacoes/' + transacao.id, transacao);
  };

  window.dbDelete = async function (id) {
    return _fetch('DELETE', '/api/transacoes/' + id);
  };

  // ── CRUD CONTAS ──────────────────────────────────────────────────────────

  window.contasGetAll = async function () {
    return _fetch('GET', '/api/contas');
  };

  window.contasAdd = async function (conta) {
    const r = await _fetch('POST', '/api/contas', conta);
    return r.id;
  };

  window.contasUpdate = async function (conta) {
    return _fetch('PUT', '/api/contas/' + conta.id, conta);
  };

  window.contasDelete = async function (id) {
    return _fetch('DELETE', '/api/contas/' + id);
  };

  // ── CRUD CATEGORIAS ──────────────────────────────────────────────────────

  window.catsGetAll = async function () {
    return _fetch('GET', '/api/categorias');
  };

  window.catsAdd = async function (cat) {
    const r = await _fetch('POST', '/api/categorias', cat);
    return r.id;
  };

  window.catsUpdate = async function (cat) {
    return _fetch('PUT', '/api/categorias/' + cat.id, cat);
  };

  window.catsDelete = async function (id) {
    return _fetch('DELETE', '/api/categorias/' + id);
  };

  // ── LIMPAR / RESTAURAR ────────────────────────────────────────────────────

  window.limparTudo = async function () {
    return _fetch('POST', '/api/utils/limpar-tudo');
  };

  window.restaurarPadroes = async function () {
    return _fetch('POST', '/api/utils/restaurar-padroes');
  };

  // ── CONFIG (chave/valor) ──────────────────────────────────────────────────

  window.configGet = async function (chave) {
    const r = await _fetch('GET', '/api/config/' + encodeURIComponent(chave));
    return r ? r.valor : null;
  };

  window.configSet = async function (chave, valor) {
    return _fetch('PUT', '/api/config/' + encodeURIComponent(chave), { valor: String(valor) });
  };

  // ── EXPORT / IMPORT JSON ──────────────────────────────────────────────────

  window.exportarJSON = async function () {
    const dados  = await window.dbGetAll();
    const contas = await window.contasGetAll();
    const cats   = await window.catsGetAll();
    const payload = { transacoes: dados, contas, categorias: cats };
    const blob  = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'financeiro_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  window.importarJSON = async function (arquivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const raw        = JSON.parse(e.target.result);
          const transacoes = Array.isArray(raw) ? raw : (raw.transacoes  || []);
          const contas     = Array.isArray(raw) ? []  : (raw.contas      || []);
          const categorias = Array.isArray(raw) ? []  : (raw.categorias  || []);

          const tItems   = transacoes.map(({ id, ...s }) => s);
          const cItems   = contas.map(({ id, ...s }) => s);
          const catItems = categorias.map(({ id, ...s }) => s);

          if (tItems.length)   await _fetch('POST', '/api/transacoes/bulk', tItems);
          if (cItems.length)   await _fetch('POST', '/api/contas/bulk', cItems);
          if (catItems.length) await _fetch('POST', '/api/categorias/bulk', catItems);

          resolve({ transacoes: transacoes.length, contas: contas.length, categorias: categorias.length });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(arquivo);
    });
  };

})();
