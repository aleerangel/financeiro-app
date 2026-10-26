import { describe, it, expect } from 'vitest';
import {
  isBusinessCategory,
  isBusinessTransaction,
  isBarbeariaServiceIncome,
  resolveIncomeCategoryMeta,
  applyScopeToNotes,
  stripScopeTagFromNotes,
  computeRevenueSplit,
  isMixedRevenueSplit,
} from './business-scope-utils';

describe('business-scope-utils', () => {
  it('identifies business categories by scope or default names', () => {
    expect(isBusinessCategory({ name: 'Insumos & Barbearia', scope: 'personal' })).toBe(true);
    expect(isBusinessCategory({ name: 'Equipamentos', scope: 'business' })).toBe(true);
    expect(isBusinessCategory({ name: 'Alimentação', scope: 'personal' })).toBe(false);
  });

  it('identifies business transactions via scope, category, or fallback tag', () => {
    expect(isBusinessTransaction({ description: 'Lâminas Feather', scope: 'business' })).toBe(true);
    expect(
      isBusinessTransaction({
        description: 'Gola higiênica',
        notes: '[Barbearia] Compra atacado',
      })
    ).toBe(true);
    expect(
      isBusinessTransaction({
        description: 'Pomada Modeladora',
        category: { name: 'Insumos & Barbearia' },
      })
    ).toBe(true);
    expect(
      isBusinessTransaction({
        description: 'Supermercado',
        scope: 'personal',
        category: { name: 'Alimentação', scope: 'personal' },
      })
    ).toBe(false);
  });

  it('applies and strips [Barbearia] tag cleanly from notes', () => {
    const tagged = applyScopeToNotes('Pacote 100 lâminas', 'business');
    expect(tagged).toBe('[Barbearia] Pacote 100 lâminas');
    expect(stripScopeTagFromNotes(tagged)).toBe('Pacote 100 lâminas');
    expect(applyScopeToNotes(tagged, 'personal')).toBe('Pacote 100 lâminas');
  });

  it('detects barbearia service income and resolves category metadata', () => {
    expect(
      isBarbeariaServiceIncome({
        description: 'Atendimento: João (Corte)',
      })
    ).toBe(true);
    expect(
      resolveIncomeCategoryMeta({
        description: 'Atendimento: João (Corte)',
      })
    ).toEqual({
      id: 'barbearia-servicos',
      name: 'Barbearia (Serviços)',
      color: '#10b981',
    });
    expect(
      resolveIncomeCategoryMeta({
        description: 'Salário Mensal',
        category: { id: 'cat-sal', name: 'Salário', color: '#3b82f6' },
      })
    ).toEqual({
      id: 'cat-sal',
      name: 'Salário',
      color: '#3b82f6',
    });
  });

  describe('computeRevenueSplit & isMixedRevenueSplit', () => {
    it('computes service and product percentages accurately', () => {
      const split = computeRevenueSplit(800, 200, 10, 4);
      expect(split.serviceRevenue).toBe(800);
      expect(split.productRevenue).toBe(200);
      expect(split.servicePercentage).toBe(80);
      expect(split.productPercentage).toBe(20);
      expect(split.serviceCount).toBe(10);
      expect(split.productCount).toBe(4);
    });

    it('handles zero total revenue safely without NaN', () => {
      const split = computeRevenueSplit(0, 0);
      expect(split.servicePercentage).toBe(0);
      expect(split.productPercentage).toBe(0);
    });

    it('identifies mixed revenue split strictly when both are greater than zero', () => {
      expect(isMixedRevenueSplit({ serviceRevenue: 100, productRevenue: 50 })).toBe(true);
      expect(isMixedRevenueSplit({ serviceRevenue: 100, productRevenue: 0 })).toBe(false);
      expect(isMixedRevenueSplit({ serviceRevenue: 0, productRevenue: 50 })).toBe(false);
      expect(isMixedRevenueSplit({ serviceRevenue: 0, productRevenue: 0 })).toBe(false);
      expect(isMixedRevenueSplit(null)).toBe(false);
      expect(isMixedRevenueSplit(undefined)).toBe(false);
    });
  });
});

