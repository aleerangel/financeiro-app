import { describe, it, expect } from 'vitest';
import {
  isBusinessCategory,
  isBusinessTransaction,
  isBarbeariaServiceIncome,
  resolveIncomeCategoryMeta,
  applyScopeToNotes,
  stripScopeTagFromNotes,
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
});

