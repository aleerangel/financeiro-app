import { describe, it, expect } from 'vitest';
import { getZonedParts, getTodayYMD, isPastMonth } from './date-utils';

describe('getZonedParts', () => {
  it('usa o fuso de São Paulo, não o do servidor (UTC)', () => {
    // 01/11 02:30 UTC = 31/10 23:30 em São Paulo (UTC-3)
    const d = new Date('2026-11-01T02:30:00Z');
    expect(getZonedParts(d)).toEqual({ year: 2026, month: 9, day: 31 });
  });

  it('retorna mês 0-indexado', () => {
    expect(getZonedParts(new Date('2026-01-15T15:00:00Z')).month).toBe(0);
  });
});

describe('getTodayYMD', () => {
  it('formata com zero à esquerda no fuso do app', () => {
    expect(getTodayYMD(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05');
  });

  it('não avança o dia após 21h no Brasil', () => {
    expect(getTodayYMD(new Date('2026-10-20T01:00:00Z'))).toBe('2026-10-19');
  });
});

describe('isPastMonth', () => {
  const now = new Date('2026-10-19T15:00:00Z'); // outubro/2026

  it('mês anterior é passado', () => {
    expect(isPastMonth(8, 2026, now)).toBe(true);
    expect(isPastMonth(11, 2025, now)).toBe(true);
  });

  it('mês atual e futuros não são passado', () => {
    expect(isPastMonth(9, 2026, now)).toBe(false);
    expect(isPastMonth(0, 2027, now)).toBe(false);
  });

  it('na virada do mês em UTC ainda é o mês anterior no Brasil', () => {
    const lateOct = new Date('2026-11-01T01:00:00Z'); // 31/10 22h em SP
    expect(isPastMonth(9, 2026, lateOct)).toBe(false);
    expect(isPastMonth(8, 2026, lateOct)).toBe(true);
  });
});

