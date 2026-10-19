import { describe, it, expect } from 'vitest';
import { isRecurrenceEligible, getCreationMonthStart, buildDueDate } from './recurrence-utils';

describe('isRecurrenceEligible', () => {
  // Criada em 15/10/2026
  const rec = { created_at: '2026-10-15T15:00:00Z', frequency: 'monthly' };

  it('não gera em meses anteriores à criação', () => {
    expect(isRecurrenceEligible(rec, 8, 2026)).toBe(false); // setembro
    expect(isRecurrenceEligible(rec, 11, 2025)).toBe(false);
  });

  it('gera no mês de criação e nos seguintes', () => {
    expect(isRecurrenceEligible(rec, 9, 2026)).toBe(true);
    expect(isRecurrenceEligible(rec, 10, 2026)).toBe(true);
    expect(isRecurrenceEligible(rec, 0, 2027)).toBe(true);
  });

  it('considera o fuso: criada 01/11 00:30 UTC ainda é outubro no Brasil', () => {
    const late = { created_at: '2026-11-01T00:30:00Z', frequency: 'monthly' };
    expect(isRecurrenceEligible(late, 9, 2026)).toBe(true);
  });

  it('anual só gera no mês de criação', () => {
    const yearly = { created_at: '2026-10-15T15:00:00Z', frequency: 'yearly' };
    expect(isRecurrenceEligible(yearly, 9, 2027)).toBe(true);
    expect(isRecurrenceEligible(yearly, 10, 2027)).toBe(false);
  });
});

describe('getCreationMonthStart', () => {
  it('retorna o dia 1 do mês de criação no fuso do app', () => {
    expect(getCreationMonthStart('2026-10-15T15:00:00Z')).toBe('2026-10-01');
    expect(getCreationMonthStart('2026-11-01T00:30:00Z')).toBe('2026-10-01');
  });
});

describe('buildDueDate', () => {
  it('formata com zero à esquerda', () => {
    expect(buildDueDate(2026, 2, 5)).toBe('2026-03-05');
  });

  it('ajusta dia 31 para o último dia do mês', () => {
    expect(buildDueDate(2026, 1, 31)).toBe('2026-02-28');
    expect(buildDueDate(2028, 1, 31)).toBe('2028-02-29'); // bissexto
    expect(buildDueDate(2026, 3, 31)).toBe('2026-04-30');
  });
});

