import { describe, it, expect } from 'vitest';
import { calcularSaldoCarteira } from '../js/utils.js';

// Fixture base — transações de 2026
const transacoes = [
  // Carteira: saldo inicial de Janeiro (entrada R$1000)
  { id: 1,  cartao: 'Carteira', mov: 'entrada', mesIdx: 0, ano: 2026, valor: 1000 },
  // Saídas Janeiro (sem Carteira)
  { id: 2,  cartao: 'Nubank',   mov: 'saida',   mesIdx: 0, ano: 2026, valor: 300  },
  { id: 3,  cartao: 'Nubank',   mov: 'saida',   mesIdx: 0, ano: 2026, valor: 200  },
  // Entradas Janeiro (sem Carteira)
  { id: 4,  cartao: 'Fixo',     mov: 'entrada', mesIdx: 0, ano: 2026, valor: 5000 },
  // Saídas Fevereiro
  { id: 5,  cartao: 'Nubank',   mov: 'saida',   mesIdx: 1, ano: 2026, valor: 400  },
  // Entradas Fevereiro
  { id: 6,  cartao: 'Fixo',     mov: 'entrada', mesIdx: 1, ano: 2026, valor: 5000 },
  // Saídas Março
  { id: 7,  cartao: 'Nubank',   mov: 'saida',   mesIdx: 2, ano: 2026, valor: 600  },
];

describe('calcularSaldoCarteira', () => {
  it('calcula corretamente para um mês específico', () => {
    // Saldo inicial: 1000
    // Janeiro: +5000 - 500 = +4500 → acumulado: 5500
    const { saldo, mesLimite } = calcularSaldoCarteira(transacoes, 0, 2026);
    expect(mesLimite).toBe(0);
    expect(saldo).toBe(5500);
  });

  it('acumula saldo mês a mês', () => {
    // Janeiro: 1000 + 5000 - 500 = 5500
    // Fevereiro: 5500 + 5000 - 400 = 10100
    const { saldo, mesLimite } = calcularSaldoCarteira(transacoes, 1, 2026);
    expect(mesLimite).toBe(1);
    expect(saldo).toBe(10100);
  });

  it('quando mesIdx = -1, usa o último mês disponível', () => {
    // Último mês com transações não-Carteira em 2026 é Março (2)
    const { mesLimite } = calcularSaldoCarteira(transacoes, -1, 2026);
    expect(mesLimite).toBe(2);
  });

  it('retorna mesLimite 0 quando não há transações no ano', () => {
    const { mesLimite } = calcularSaldoCarteira(transacoes, -1, 2099);
    expect(mesLimite).toBe(0);
  });

  it('saldo negativo quando saídas superam entradas', () => {
    const trans = [
      { cartao: 'Carteira', mov: 'entrada', mesIdx: 0, ano: 2026, valor: 100 },
      { cartao: 'Nubank',   mov: 'saida',   mesIdx: 0, ano: 2026, valor: 600 },
      { cartao: 'Fixo',     mov: 'entrada', mesIdx: 0, ano: 2026, valor: 200 },
    ];
    // saldo inicial: 100 | jan: +200 -600 = -300 → total: -200
    const { saldo } = calcularSaldoCarteira(trans, 0, 2026);
    expect(saldo).toBe(-300);
  });

  it('ignora transações de outros anos', () => {
    const trans = [
      { cartao: 'Carteira', mov: 'entrada', mesIdx: 0, ano: 2025, valor: 9999 },
      { cartao: 'Carteira', mov: 'entrada', mesIdx: 0, ano: 2026, valor: 500  },
      { cartao: 'Fixo',     mov: 'entrada', mesIdx: 0, ano: 2026, valor: 1000 },
      { cartao: 'Nubank',   mov: 'saida',   mesIdx: 0, ano: 2026, valor: 200  },
    ];
    const { saldo } = calcularSaldoCarteira(trans, 0, 2026);
    // saldo inicial 500 + jan: 1000 - 200 = 800 → total: 1300
    expect(saldo).toBe(1300);
  });
});
