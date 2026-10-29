/**
 * api.js — camada de dados via HTTP (substitui db.js/IndexedDB).
 *
 * Expõe as MESMAS funções globais que o db.js original, então os
 * controllers (lancamentos.js, dashboard.js, config.js) não precisam mudar.
 *
 * Depende de: js/auth.js (para obter o token).
 */

// ── CLIENTE HTTP ──────────────────────────────────────────────────────────

async function _fetch(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = window._authToken || localStorage.getItem('ff_token');
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);

  // Se o token expirou, manda para o login
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

  // DELETE e PUT retornam { ok: true }, GET retorna array/objeto, POST retorna { id }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

// ── CRUD TRANSAÇÕES ────────────────────────────────────────────────────────

async function dbGetAll() {
  return _fetch('GET', '/api/transacoes');
}

async function dbAdd(transacao) {
  const r = await _fetch('POST', '/api/transacoes', transacao);
  return r.id;
}

async function dbUpdate(transacao) {
  return _fetch('PUT', '/api/transacoes/' + transacao.id, transacao);
}

async function dbDelete(id) {
  return _fetch('DELETE', '/api/transacoes/' + id);
}

// ── CRUD CONTAS ─────────────────────────────────────────────────────────────

async function contasGetAll() {
  return _fetch('GET', '/api/contas');
}

async function contasAdd(conta) {
  const r = await _fetch('POST', '/api/contas', conta);
  return r.id;
}

async function contasUpdate(conta) {
  return _fetch('PUT', '/api/contas/' + conta.id, conta);
}

async function contasDelete(id) {
  return _fetch('DELETE', '/api/contas/' + id);
}

// ── CRUD CATEGORIAS ─────────────────────────────────────────────────────────

async function catsGetAll() {
  return _fetch('GET', '/api/categorias');
}

async function catsAdd(cat) {
  const r = await _fetch('POST', '/api/categorias', cat);
  return r.id;
}

async function catsUpdate(cat) {
  return _fetch('PUT', '/api/categorias/' + cat.id, cat);
}

async function catsDelete(id) {
  return _fetch('DELETE', '/api/categorias/' + id);
}

// ── LIMPAR / RESTAURAR ────────────────────────────────────────────────────

async function limparTudo() {
  return _fetch('POST', '/api/utils/limpar-tudo');
}

async function restaurarPadroes() {
  return _fetch('POST', '/api/utils/restaurar-padroes');
}

// ── EXPORT / IMPORT JSON ────────────────────────────────────────────────────

async function exportarJSON() {
  const dados  = await dbGetAll();
  const contas = await contasGetAll();
  const cats   = await catsGetAll();
  const payload = { transacoes: dados, contas, categorias: cats };
  const blob  = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `financeiro_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importarJSON(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const raw        = JSON.parse(e.target.result);
        const transacoes = Array.isArray(raw) ? raw : (raw.transacoes  || []);
        const contas     = Array.isArray(raw) ? []  : (raw.contas      || []);
        const categorias = Array.isArray(raw) ? []  : (raw.categorias  || []);

        // Envia em lote (bulk) — muito mais rápido que chamadas individuais
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
}
