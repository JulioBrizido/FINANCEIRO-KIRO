import { describe, it, expect } from 'vitest';
import {
  MESES_PT,
  fmt,
  formatarData,
  gerarParcelas,
  filtrarLancamentos,
  ordenarLancamentos,
  calcularTotais,
} from '../js/utils.js';

// ── fmt ───────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('formata zero', () => {
    expect(fmt(0)).toBe('R$\u00a00,00');
  });

  it('formata valor inteiro', () => {
    expect(fmt(1000)).toBe('R$\u00a01.000,00');
  });

  it('formata valor decimal', () => {
    expect(fmt(99.90)).toBe('R$\u00a099,90');
  });

  it('formata valor negativo', () => {
    expect(fmt(-50)).toContain('50');
  });
});

// ── formatarData ──────────────────────────────────────────────────────────

describe('formatarData', () => {
  it('converte ISO para dd/mm/yyyy', () => {
    expect(formatarData('2026-08-09')).toBe('09/08/2026');
  });

  it('retorna "—" para string vazia', () => {
    expect(formatarData('')).toBe('—');
  });

  it('retorna "—" para null', () => {
    expect(formatarData(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(formatarData(undefined)).toBe('—');
  });
});

// ── gerarParcelas ─────────────────────────────────────────────────────────

describe('gerarParcelas', () => {
  const base = {
    mov: 'saida', cartao: 'Nubank', ano: 2026, mesIdx: 0,
    descricao: 'Notebook', tipo: 'Tecnologia', venc: '10', data: '2026-01-15', valor: 300,
  };

  it('gera a quantidade correta de parcelas', () => {
    expect(gerarParcelas(base, 3)).toHaveLength(3);
  });

  it('divide o valor igualmente', () => {
    const parcelas = gerarParcelas(base, 3);
    parcelas.forEach(p => expect(p.valor).toBe(100));
  });

  it('incrementa o mês corretamente', () => {
    const parcelas = gerarParcelas(base, 3);
    expect(parcelas[0].mesIdx).toBe(0); // Janeiro
    expect(parcelas[1].mesIdx).toBe(1); // Fevereiro
    expect(parcelas[2].mesIdx).toBe(2); // Março
  });

  it('avança o ano ao ultrapassar dezembro', () => {
    const baseNov = { ...base, mesIdx: 10 }; // Novembro
    const parcelas = gerarParcelas(baseNov, 3);
    expect(parcelas[0].ano).toBe(2026); // Novembro/2026
    expect(parcelas[1].ano).toBe(2026); // Dezembro/2026
    expect(parcelas[2].ano).toBe(2027); // Janeiro/2027
  });

  it('adiciona o sufixo (x/n) na descrição', () => {
    const parcelas = gerarParcelas(base, 2);
    expect(parcelas[0].descricao).toBe('Notebook (1/2)');
    expect(parcelas[1].descricao).toBe('Notebook (2/2)');
  });

  it('usa o nome correto do mês', () => {
    const parcelas = gerarParcelas(base, 2);
    expect(parcelas[0].mes).toBe('Janeiro');
    expect(parcelas[1].mes).toBe('Fevereiro');
  });
});

// ── filtrarLancamentos ────────────────────────────────────────────────────

describe('filtrarLancamentos', () => {
  const lista = [
    { id: 1, mov: 'saida',   mesIdx: 0, ano: 2026, cartao: 'Nubank',   tipo: 'Mercado', descricao: 'Supermercado', valor: 200  },
    { id: 2, mov: 'saida',   mesIdx: 1, ano: 2026, cartao: 'Bradesco', tipo: 'Lazer',   descricao: 'Cinema',       valor: 50   },
    { id: 3, mov: 'entrada', mesIdx: 0, ano: 2026, cartao: 'Carteira', tipo: 'Salário', descricao: 'Salário Jan',  valor: 5000 },
    { id: 4, mov: 'saida',   mesIdx: 0, ano: 2025, cartao: 'Nubank',   tipo: 'Mercado', descricao: 'Mercadinho',   valor: 80   },
  ];

  it('retorna tudo sem filtros', () => {
    expect(filtrarLancamentos(lista)).toHaveLength(4);
  });

  it('filtra por movimento saida', () => {
    const r = filtrarLancamentos(lista, { movF: 'saida' });
    expect(r).toHaveLength(3);
    expect(r.every(t => t.mov === 'saida')).toBe(true);
  });

  it('filtra por movimento entrada', () => {
    const r = filtrarLancamentos(lista, { movF: 'entrada' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(3);
  });

  it('filtra por mês', () => {
    const r = filtrarLancamentos(lista, { mesF: 0 });
    expect(r).toHaveLength(3);
  });

  it('filtra por ano', () => {
    const r = filtrarLancamentos(lista, { anoF: 2025 });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(4);
  });

  it('filtra por cartao/conta', () => {
    const r = filtrarLancamentos(lista, { cartaoF: 'Nubank' });
    expect(r).toHaveLength(2);
  });

  it('filtra por categoria com formato mov|nome', () => {
    const r = filtrarLancamentos(lista, { tipoF: 'saida|Mercado' });
    expect(r).toHaveLength(2);
    expect(r.every(t => t.tipo === 'Mercado')).toBe(true);
  });

  it('não mistura categoria de mesmo nome entre saida e entrada', () => {
    const listaMista = [
      { id: 10, mov: 'saida',   tipo: 'Outros', descricao: 'a', mesIdx: 0, ano: 2026, cartao: 'x', valor: 10 },
      { id: 11, mov: 'entrada', tipo: 'Outros', descricao: 'b', mesIdx: 0, ano: 2026, cartao: 'x', valor: 10 },
    ];
    const r = filtrarLancamentos(listaMista, { tipoF: 'saida|Outros' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(10);
  });

  it('filtra por busca de descrição (case insensitive)', () => {
    const r = filtrarLancamentos(lista, { busca: 'super' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });

  it('combina múltiplos filtros', () => {
    const r = filtrarLancamentos(lista, { movF: 'saida', anoF: 2026, cartaoF: 'Nubank' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });
});

// ── ordenarLancamentos ────────────────────────────────────────────────────

describe('ordenarLancamentos', () => {
  const lista = [
    { id: 1, mov: 'saida', ano: 2026, mesIdx: 0, valor: 100, data: '2026-01-10' },
    { id: 2, mov: 'saida', ano: 2026, mesIdx: 0, valor: 300, data: '2026-01-05' },
    { id: 3, mov: 'saida', ano: 2026, mesIdx: 0, valor: 200, data: '2026-01-20' },
  ];

  it('ordena por valor desc (padrão)', () => {
    const r = ordenarLancamentos(lista, 'valor', 'desc');
    expect(r.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('ordena por valor asc', () => {
    const r = ordenarLancamentos(lista, 'valor', 'asc');
    expect(r.map(t => t.id)).toEqual([1, 3, 2]);
  });

  it('ordena por data desc', () => {
    const r = ordenarLancamentos(lista, 'data', 'desc');
    expect(r.map(t => t.id)).toEqual([3, 1, 2]);
  });

  it('ordena por data asc', () => {
    const r = ordenarLancamentos(lista, 'data', 'asc');
    expect(r.map(t => t.id)).toEqual([2, 1, 3]);
  });

  it('não muta a lista original', () => {
    const idAntes = lista.map(t => t.id);
    ordenarLancamentos(lista, 'valor', 'asc');
    expect(lista.map(t => t.id)).toEqual(idAntes);
  });

  it('entradas aparecem antes de saídas', () => {
    const mista = [
      { id: 1, mov: 'saida',   ano: 2026, mesIdx: 0, valor: 500, data: '' },
      { id: 2, mov: 'entrada', ano: 2026, mesIdx: 0, valor: 100, data: '' },
    ];
    const r = ordenarLancamentos(mista, 'valor', 'desc');
    expect(r[0].mov).toBe('entrada');
  });
});

// ── calcularTotais ────────────────────────────────────────────────────────

describe('calcularTotais', () => {
  const lista = [
    { mov: 'entrada', valor: 5000 },
    { mov: 'entrada', valor: 1000 },
    { mov: 'saida',   valor: 2000 },
    { mov: 'saida',   valor: 500  },
  ];

  it('soma entradas corretamente', () => {
    expect(calcularTotais(lista).entradas).toBe(6000);
  });

  it('soma saídas corretamente', () => {
    expect(calcularTotais(lista).saidas).toBe(2500);
  });

  it('calcula saldo positivo', () => {
    expect(calcularTotais(lista).saldo).toBe(3500);
  });

  it('calcula saldo negativo', () => {
    const r = calcularTotais([
      { mov: 'entrada', valor: 100 },
      { mov: 'saida',   valor: 400 },
    ]);
    expect(r.saldo).toBe(-300);
  });

  it('retorna zeros para lista vazia', () => {
    expect(calcularTotais([])).toEqual({ entradas: 0, saidas: 0, saldo: 0 });
  });

  it('trata mov ausente como saida', () => {
    const r = calcularTotais([{ valor: 100 }]);
    expect(r.saidas).toBe(100);
    expect(r.entradas).toBe(0);
  });
});
