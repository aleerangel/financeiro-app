import { describe, it, expect } from 'vitest';
import {
  resolveAccountYieldConfig,
  calculateProjectedYield,
  isYieldTransaction,
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
});
