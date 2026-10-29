/**
 * seed.js — dados padrão (contas e categorias) inseridos para cada novo usuário.
 * Mantido em sincronia com as constantes do db.js original.
 */

const CATS_PADRAO = [
  { nome: 'Casa',          mov: 'saida',   cor: '#6c63ff' },
  { nome: 'Mercado',       mov: 'saida',   cor: '#22c55e' },
  { nome: 'Restaurante',   mov: 'saida',   cor: '#ef4444' },
  { nome: 'Lazer',         mov: 'saida',   cor: '#f59e0b' },
  { nome: 'Saúde',         mov: 'saida',   cor: '#38bdf8' },
  { nome: 'Roupa',         mov: 'saida',   cor: '#06b6d4' },
  { nome: 'Carro',         mov: 'saida',   cor: '#64748b' },
  { nome: 'Padaria',       mov: 'saida',   cor: '#84cc16' },
  { nome: 'Silvia',        mov: 'saida',   cor: '#f472b6' },
  { nome: 'Letícia',       mov: 'saida',   cor: '#a78bfa' },
  { nome: 'Silvana',       mov: 'saida',   cor: '#fb923c' },
  { nome: 'Aventureiros',  mov: 'saida',   cor: '#f97316' },
  { nome: 'Escola',        mov: 'saida',   cor: '#0ea5e9' },
  { nome: 'Festa',         mov: 'saida',   cor: '#ec4899' },
  { nome: 'Outros',        mov: 'saida',   cor: '#94a3b8' },
  { nome: 'Salário',       mov: 'entrada', cor: '#22c55e' },
  { nome: 'Aluguel',       mov: 'entrada', cor: '#34d399' },
  { nome: 'Repasse',       mov: 'entrada', cor: '#6ee7b7' },
  { nome: 'Cartão Silvia', mov: 'entrada', cor: '#f472b6' },
  { nome: 'Letícia',       mov: 'entrada', cor: '#a78bfa' },
  { nome: 'Silvana',       mov: 'entrada', cor: '#fb923c' },
  { nome: 'Férias',        mov: 'entrada', cor: '#fbbf24' },
  { nome: 'Empréstimo',    mov: 'entrada', cor: '#94a3b8' },
  { nome: 'Outros',        mov: 'entrada', cor: '#64748b' },
];

const CONTAS_PADRAO = [
  { nome: 'Bradesco', tipo: 'cartao',   cor: '#6c63ff' },
  { nome: 'Nubank',   tipo: 'cartao',   cor: '#f472b6' },
  { nome: 'Itaú',     tipo: 'cartao',   cor: '#f59e0b' },
  { nome: 'Carteira', tipo: 'carteira', cor: '#22c55e' },
  { nome: 'Fixo',     tipo: 'conta',    cor: '#94a3b8' },
];

module.exports = { CATS_PADRAO, CONTAS_PADRAO };
