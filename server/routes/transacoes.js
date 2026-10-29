/**
 * routes/transacoes.js — CRUD de transações do usuário autenticado.
 *
 * GET    /api/transacoes        → lista todas
 * POST   /api/transacoes        → cria uma
 * PUT    /api/transacoes/:id    → atualiza
 * DELETE /api/transacoes/:id    → exclui
 * POST   /api/transacoes/bulk    → cria várias (importação)
 * DELETE /api/transacoes        → exclui todas do usuário
 */

const express = require('express');
const { getDB, transaction } = require('../database');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

// Remove o campo user_id dos resultados enviados ao frontend
function clean(row) {
  if (Array.isArray(row)) return row.map(clean);
  if (!row) return row;
  const { user_id, ...rest } = row;
  return rest;
}

// ── LISTAR ────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM transacoes WHERE user_id = ? ORDER BY id').all(req.user.id);
  res.json(clean(rows));
});

// ── CRIAR ─────────────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const { mov = 'saida', cartao, ano, mesIdx, mes, descricao, tipo, venc, data, valor } = req.body;

  if (!cartao || !descricao || valor == null) {
    return res.status(400).json({ error: 'Cartão, descrição e valor são obrigatórios.' });
  }

  const db = getDB();
  const info = db.prepare(`
    INSERT INTO transacoes (user_id, mov, cartao, ano, mesIdx, mes, descricao, tipo, venc, data, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, mov, cartao, ano ?? null, mesIdx ?? 0, mes || '', descricao, tipo || '', venc || null, data || null, valor);

  res.status(201).json({ id: info.lastInsertRowid });
});

// ── CRIAR VÁRIAS (BULK) ───────────────────────────────────────────────────

router.post('/bulk', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  if (items.length === 0) return res.json({ count: 0 });

  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO transacoes (user_id, mov, cartao, ano, mesIdx, mes, descricao, tipo, venc, data, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  transaction(db, () => {
    for (const t of items) {
      stmt.run(
        req.user.id,
        t.mov || 'saida', t.cartao || '', t.ano ?? null, t.mesIdx ?? 0,
        t.mes || '', t.descricao || '', t.tipo || '', t.venc || null, t.data || null, t.valor ?? 0
      );
    }
  });

  res.status(201).json({ count: items.length });
});

// ── ATUALIZAR ─────────────────────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id);
  const { mov, cartao, ano, mesIdx, mes, descricao, tipo, venc, data, valor } = req.body;

  const result = db.prepare(`
    UPDATE transacoes SET
      mov = ?, cartao = ?, ano = ?, mesIdx = ?, mes = ?,
      descricao = ?, tipo = ?, venc = ?, data = ?, valor = ?
    WHERE id = ? AND user_id = ?
  `).run(
    mov || 'saida', cartao || '', ano ?? null, mesIdx ?? 0, mes || '',
    descricao || '', tipo || '', venc || null, data || null, valor ?? 0,
    id, req.user.id
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }
  res.json({ ok: true });
});

// ── EXCLUIR ───────────────────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM transacoes WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id), req.user.id
  );
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }
  res.json({ ok: true });
});

// ── EXCLUIR TODAS ──────────────────────────────────────────────────────────

router.delete('/', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM transacoes WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
