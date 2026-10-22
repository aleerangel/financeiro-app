import { describe, it, expect } from 'vitest';
import {
  getZonedParts,
  getTodayYMD,
  getZonedYMD,
  getZonedRangeBoundsIso,
  resolveSaleTimestamps,
  isPastMonth,
} from './date-utils';
import { formatDateTime, formatDate } from './utils';

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

describe('getTodayYMD e getZonedYMD', () => {
  it('formata com zero à esquerda no fuso do app', () => {
    expect(getTodayYMD(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05');
  });

  it('não avança o dia após 21h no Brasil', () => {
    expect(getTodayYMD(new Date('2026-10-20T01:00:00Z'))).toBe('2026-10-19');
    expect(getZonedYMD('2026-10-21T00:30:00Z')).toBe('2026-10-20');
  });

  it('preserva strings YYYY-MM-DD puras', () => {
    expect(getZonedYMD('2026-10-20')).toBe('2026-10-20');
  });
});

describe('getZonedRangeBoundsIso e resolveSaleTimestamps', () => {
  it('gera limites de dia no fuso -03:00', () => {
    const bounds = getZonedRangeBoundsIso('2026-10-20');
    expect(bounds.startIso).toBe('2026-10-20T00:00:00.000-03:00');
    expect(bounds.endIso).toBe('2026-10-20T23:59:59.999-03:00');
  });

  it('mantém a data da venda no fuso de São Paulo mesmo após 21h (00h UTC)', () => {
    const lateNightNow = new Date('2026-10-21T00:30:00Z'); // 20/10 às 21:30 BRT
    const res = resolveSaleTimestamps(undefined, lateNightNow);
    expect(res.dateOnlyStr).toBe('2026-10-20');
    expect(formatDateTime('2026-10-21T00:30:00Z')).toBe('20/10/2026, 21:30');
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

describe('formatDate', () => {
  it('formata strings YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDate('2026-10-15')).toBe('15/10/2026');
  });

  it('formata strings ISO com timezone sem quebrar o formato DD/MM/YYYY', () => {
    // 2026-10-15T23:48:06+00:00 = 15/10/2026 às 20:48 em SP
    expect(formatDate('2026-10-15T23:48:06+00:00')).toBe('15/10/2026');
    // 2026-10-21T00:30:00Z = 20/10/2026 às 21:30 em SP
    expect(formatDate('2026-10-21T00:30:00Z')).toBe('20/10/2026');
  });

  it('retorna string vazia se entrada vazia ou nula', () => {
    expect(formatDate('')).toBe('');
  });
});


