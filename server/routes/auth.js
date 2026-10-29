/**
 * routes/auth.js — cadastro, login e dados do usuário logado.
 *
 * POST /api/auth/register  → cria usuário + semeia contas/categorias padrão
 * POST /api/auth/login     → valida credenciais e retorna JWT
 * GET  /api/auth/me        → dados do usuário autenticado
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDB, transaction } = require('../database');
const { signToken, requireAuth } = require('../middleware');
const { CATS_PADRAO, CONTAS_PADRAO } = require('../seed');

const router = express.Router();

// ── CADASTRO ──────────────────────────────────────────────────────────────

router.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }
  if (senha.length < 4) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
  }

  const db = getDB();

  // Verifica se o email já existe
  const existente = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (existente) {
    return res.status(409).json({ error: 'Este email já está cadastrado.' });
  }

  const hash = bcrypt.hashSync(senha, 10);

  // Cria o usuário
  const info = db.prepare('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)').run(
    nome, String(email).toLowerCase(), hash
  );
  const userId = info.lastInsertRowid;

  // Semeia contas e categorias padrão para o novo usuário
  const insConta = db.prepare('INSERT INTO contas (user_id, nome, tipo, cor) VALUES (?, ?, ?, ?)');
  const insCat   = db.prepare('INSERT INTO categorias (user_id, nome, mov, cor) VALUES (?, ?, ?, ?)');

  transaction(db, () => {
    CONTAS_PADRAO.forEach(c => insConta.run(userId, c.nome, c.tipo, c.cor));
    CATS_PADRAO.forEach(c => insCat.run(userId, c.nome, c.mov, c.cor));
  });

  const token = signToken({ id: userId, nome, email: String(email).toLowerCase() });
  res.status(201).json({ token, user: { id: userId, nome, email: String(email).toLowerCase() } });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());

  if (!user || !bcrypt.compareSync(senha, user.senha)) {
    return res.status(401).json({ error: 'Email ou senha incorretos.' });
  }

  const token = signToken({ id: user.id, nome: user.nome, email: user.email });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
});

// ── USUÁRIO ATUAL ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
