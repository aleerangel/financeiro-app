import { describe, it, expect } from 'vitest';
import { calculateInstallmentDueDates } from './credit-card-utils';

describe('credit-card-utils - calculateInstallmentDueDates', () => {
  it('places purchase on current invoice when transaction is on or before closing day (dueDay > closingDay)', () => {
    // Cartão fecha dia 10 e vence dia 20
    const dates = calculateInstallmentDueDates('2026-10-08', 10, 20, 1);
    expect(dates).toEqual(['2026-10-20']);
  });

  it('places purchase on next invoice when transaction is after closing day', () => {
    // Cartão fecha dia 10 e vence dia 20; compra feita dia 12/10 vai para 20/11
    const dates = calculateInstallmentDueDates('2026-10-12', 10, 20, 1);
    expect(dates).toEqual(['2026-11-20']);
  });

  it('rolls due date to following month when dueDay < closingDay (e.g. closes 25, due 05)', () => {
    // Compra antes do fechamento (20/10): fecha em 25/10 e vence em 05/11
    expect(calculateInstallmentDueDates('2026-10-20', 25, 5, 1)).toEqual([
      '2026-11-05',
    ]);

    // Compra após o fechamento (27/10): fecha em 25/11 e vence em 05/12
    expect(calculateInstallmentDueDates('2026-10-27', 25, 5, 1)).toEqual([
      '2026-12-05',
    ]);
  });

  it('generates consecutive monthly installment dates across year boundaries and clamps day 31 in short months', () => {
    const dates = calculateInstallmentDueDates('2026-12-02', 10, 31, 4);
    expect(dates).toEqual([
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
  });
});

