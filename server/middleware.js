/**
 * middleware.js — middleware de autenticação JWT.
 *
 * `requireAuth` protege rotas da API: extrai o token do header
 * Authorization e anexa `req.user = { id, nome, email }`.
 */

const jwt = require('jsonwebtoken');

// Em produção, sempre defina JWT_SECRET no ambiente.
const JWT_SECRET = process.env.JWT_SECRET || 'financeiro-facil-dev-secret-change-me';
const JWT_EXPIRES = '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
