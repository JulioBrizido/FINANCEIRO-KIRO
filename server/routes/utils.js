/**
 * routes/utils.js — operações utilitárias do usuário autenticado.
 *
 * POST /api/utils/limpar-tudo          → exclui transações, contas e categorias
 * POST /api/utils/restaurar-padroes    → recria contas e categorias padrão
 */

const express = require('express');
const { getDB, transaction } = require('../database');
const { requireAuth } = require('../middleware');
const { CATS_PADRAO, CONTAS_PADRAO } = require('../seed');

const router = express.Router();
router.use(requireAuth);

// ── LIMPAR TUDO ────────────────────────────────────────────────────────────

router.post('/limpar-tudo', (req, res) => {
  const db = getDB();
  const uid = req.user.id;

  const tx = transaction(db, () => {
    db.prepare('DELETE FROM transacoes WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM contas WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM categorias WHERE user_id = ?').run(uid);
  });

  res.json({ ok: true });
});

// ── RESTAURAR PADRÕES ──────────────────────────────────────────────────────

router.post('/restaurar-padroes', (req, res) => {
  const db = getDB();
  const uid = req.user.id;

  const insConta = db.prepare('INSERT INTO contas (user_id, nome, tipo, cor) VALUES (?, ?, ?, ?)');
  const insCat   = db.prepare('INSERT INTO categorias (user_id, nome, mov, cor) VALUES (?, ?, ?, ?)');

  transaction(db, () => {
    db.prepare('DELETE FROM contas WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM categorias WHERE user_id = ?').run(uid);
    CONTAS_PADRAO.forEach(c => insConta.run(uid, c.nome, c.tipo, c.cor));
    CATS_PADRAO.forEach(c => insCat.run(uid, c.nome, c.mov, c.cor));
  });

  res.json({ ok: true });
});

module.exports = router;
