import { describe, it, expect } from 'vitest';
import {
  calculateProductGrowth,
  getProductGrowthCutoffDay,
} from './product-growth-utils';

describe('Crescimento de Produtos/Serviços (MTD vs Período Equivalente)', () => {
  it('calcula crescimento positivo quando o mês atual vende mais que o período equivalente anterior', () => {
    // Exemplo: de 1 a 4 de outubro vendeu 4 unidades; de 1 a 4 de novembro vendeu 6 unidades -> +50%
    expect(calculateProductGrowth(6, 4)).toBe(50);
    // Vendeu 10 vs 5 -> +100%
    expect(calculateProductGrowth(10, 5)).toBe(100);
  });

  it('calcula queda percentual quando o mês atual vende menos que o anterior', () => {
    // De 1 a 4 de outubro vendeu 4; de 1 a 4 de novembro vendeu 2 -> -50%
    expect(calculateProductGrowth(2, 4)).toBe(-50);
    // De 1 a 4 de outubro vendeu 10; de 1 a 4 de novembro vendeu 7 -> -30%
    expect(calculateProductGrowth(7, 10)).toBe(-30);
  });

  it('retorna 100% para novos produtos que venderam no atual mas tiveram 0 no anterior', () => {
    expect(calculateProductGrowth(5, 0)).toBe(100);
  });

  it('retorna 0% quando não houve vendas em ambos os períodos', () => {
    expect(calculateProductGrowth(0, 0)).toBe(0);
  });

  it('define cutoff day como o dia atual quando o mês selecionado é o mês corrente em andamento', () => {
    // Simula hoje como 04/11/2026
    const mockNow = new Date('2026-11-04T12:00:00-03:00');
    // Mês 10 = Novembro (0-indexado)
    const cutoff = getProductGrowthCutoffDay(2026, 10, mockNow);
    expect(cutoff).toBe(4);
  });

  it('define cutoff day como 31 para meses anteriores já encerrados', () => {
    // Simula hoje como 04/11/2026
    const mockNow = new Date('2026-11-04T12:00:00-03:00');
    // Mês 9 = Outubro (já encerrado)
    const cutoff = getProductGrowthCutoffDay(2026, 9, mockNow);
    expect(cutoff).toBe(31);
  });
});

