import { describe, it, expect } from 'vitest';
import { calcularPreviewParc } from '../js/utils.js';

describe('calcularPreviewParc', () => {
  it('retorna null para 1 parcela', () => {
    expect(calcularPreviewParc(1, 300, 0, 2026)).toBeNull();
  });

  it('retorna null para 0 parcelas', () => {
    expect(calcularPreviewParc(0, 300, 0, 2026)).toBeNull();
  });

  it('calcula valor por parcela corretamente', () => {
    const r = calcularPreviewParc(3, 300, 0, 2026);
    expect(r.valorParcela).toBe(100);
  });

  it('arredonda valor por parcela a 2 casas', () => {
    // 100 / 3 = 33.333... → 33.33
    const r = calcularPreviewParc(3, 100, 0, 2026);
    expect(r.valorParcela).toBe(33.33);
  });

  it('calcula mês final no mesmo ano', () => {
    // Janeiro + 2 parcelas → termina em Março
    const r = calcularPreviewParc(3, 300, 0, 2026);
    expect(r.mesFim).toBe(2);
    expect(r.anoFim).toBe(2026);
    expect(r.label).toBe('Março/2026');
  });

  it('avança o ano quando parcelas ultrapassam dezembro', () => {
    // Novembro (10) + 3 parcelas → Nov, Dez, Jan/2027
    const r = calcularPreviewParc(3, 300, 10, 2026);
    expect(r.mesFim).toBe(0);  // Janeiro
    expect(r.anoFim).toBe(2027);
    expect(r.label).toBe('Janeiro/2027');
  });

  it('parcela única de dezembro fica em dezembro', () => {
    const r = calcularPreviewParc(2, 200, 11, 2026);
    // Dez + 1 → Janeiro/2027
    expect(r.mesFim).toBe(0);
    expect(r.anoFim).toBe(2027);
  });

  it('12 parcelas a partir de janeiro termina em dezembro do mesmo ano', () => {
    const r = calcularPreviewParc(12, 1200, 0, 2026);
    expect(r.mesFim).toBe(11); // Dezembro
    expect(r.anoFim).toBe(2026);
    expect(r.label).toBe('Dezembro/2026');
  });

  it('13 parcelas a partir de janeiro termina em janeiro do próximo ano', () => {
    const r = calcularPreviewParc(13, 1300, 0, 2026);
    expect(r.mesFim).toBe(0);
    expect(r.anoFim).toBe(2027);
  });
});
