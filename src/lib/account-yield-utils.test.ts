import { describe, it, expect } from 'vitest';
import {
  resolveAccountYieldConfig,
  calculateProjectedYield,
  isYieldTransaction,
  calculatePendingProjectedYield,
} from './account-yield-utils';

describe('account-yield-utils', () => {
  it('resolves explicit and automatic Nubank CDI yield config', () => {
    const nubankAuto = resolveAccountYieldConfig({
      name: 'Nubank',
      type: 'checking',
    });
    expect(nubankAuto.yieldType).toBe('cdi_percent');
    expect(nubankAuto.yieldRate).toBe(100);
    expect(nubankAuto.label).toBe('100% do CDI');

    const explicit = resolveAccountYieldConfig({
      name: 'Caixinha Reserva',
      type: 'investment',
      yield_type: 'cdi_percent',
      yield_rate: 110,
    });
    expect(explicit.label).toBe('110% do CDI');
    expect(explicit.effectiveMonthlyPercent).toBeCloseTo(0.935, 3);
  });

  it('calculates 30-day and 12-month compound projections', () => {
    const { monthlyEstimate, yearlyEstimate } = calculateProjectedYield(1000, 1);
    expect(monthlyEstimate).toBe(10);
    expect(yearlyEstimate).toBeCloseTo(126.83, 2);
  });

  it('identifies yield transactions accurately', () => {
    expect(
      isYieldTransaction({
        type: 'income',
        description: 'Rendimento: Nubank',
        notes: '[Rendimento] Juros em conta',
      })
    ).toBe(true);
    expect(
      isYieldTransaction({
        type: 'income',
        description: 'Atendimento: João',
        notes: null,
      })
    ).toBe(false);
  });

  it('calculates pending projected yields correctly across past, current, and future months', () => {
    const accounts = [
      { estimated_monthly_yield: 93.0, total_yield_current_month: 30.0 }, // 93.0/mês (~3.0/dia em mês de 31 dias)
      { estimated_monthly_yield: 20.0, total_yield_current_month: 25.0 }, // 0 pendente (já superou)
    ];

    // Mês atual no 1º dia (Outubro 2026, dia 1 de 31): restam 30 dias (93.0 * 30/31 = 90.0)
    // Como unrecordedEst é 63.0 (93.0 - 30.0), Math.min(63.0, 90.0) = 63.0
    const startOfMonthPending = calculatePendingProjectedYield(accounts, 9, 2026, 9, 2026, 1);
    expect(startOfMonthPending).toBe(63.0);

    // Mês atual na metade (dia 16 de 31): restam 15 dias (93.0 * 15/31 = 45.0)
    // Como unrecordedEst é 63.0, Math.min(63.0, 45.0) = 45.0
    const midMonthPending = calculatePendingProjectedYield(accounts, 9, 2026, 9, 2026, 16);
    expect(midMonthPending).toBe(45.0);

    // Mês atual no último dia (dia 31 de 31): restam 0 dias -> 0
    const lastDayPending = calculatePendingProjectedYield(accounts, 9, 2026, 9, 2026, 31);
    expect(lastDayPending).toBe(0);

    // Mês passado (Setembro 2026): deve ser 0
    const pastPending = calculatePendingProjectedYield(accounts, 8, 2026, 9, 2026);
    expect(pastPending).toBe(0);

    // Mês futuro (Novembro 2026): deve somar o estimado total (93.0 + 20 = 113.0)
    const futurePending = calculatePendingProjectedYield(accounts, 10, 2026, 9, 2026);
    expect(futurePending).toBe(113.0);
  });
});

