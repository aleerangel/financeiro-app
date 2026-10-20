import { describe, it, expect } from 'vitest';
import {
  buildYearlyCategoryEvolution,
  computeCategoryEvolutionMetrics,
} from './category-evolution-utils';

describe('category-evolution-utils', () => {
  it('groups yearly transactions into income and expense categories with realized and total arrays', () => {
    const txs = [
      {
        amount: 1200,
        type: 'income' as const,
        is_paid: true,
        due_date: '2026-09-10',
        description: 'Atendimento: Corte',
      },
      {
        amount: 1500,
        type: 'income' as const,
        is_paid: true,
        due_date: '2026-10-12',
        description: 'Atendimento: Corte + Barba',
      },
      {
        amount: 300,
        type: 'income' as const,
        is_paid: false,
        due_date: '2026-10-25',
        description: 'Atendimento agendado',
      },
      {
        amount: 400,
        type: 'expense' as const,
        is_paid: true,
        due_date: '2026-09-05',
        category: { name: 'Alimentação', color: '#ef4444' },
      },
      {
        amount: 600,
        type: 'expense' as const,
        is_paid: true,
        due_date: '2026-10-08',
        category: { name: 'Alimentação', color: '#ef4444' },
      },
    ];

    const { incomeCategories, expenseCategories } = buildYearlyCategoryEvolution(txs, 2026);

    expect(incomeCategories).toHaveLength(1);
    expect(incomeCategories[0].name).toBe('Barbearia (Serviços)');
    expect(incomeCategories[0].monthlyRealized[8]).toBe(1200); // Setembro (idx 8)
    expect(incomeCategories[0].monthlyRealized[9]).toBe(1500); // Outubro (idx 9)
    expect(incomeCategories[0].monthlyTotal[9]).toBe(1800); // 1500 + 300 pendente

    expect(expenseCategories).toHaveLength(1);
    expect(expenseCategories[0].name).toBe('Alimentação');
    expect(expenseCategories[0].monthlyRealized[8]).toBe(400);
    expect(expenseCategories[0].monthlyRealized[9]).toBe(600);
  });

  it('computes average status (above / below) and month-over-month variation accurately', () => {
    const { expenseCategories } = buildYearlyCategoryEvolution(
      [
        {
          amount: 400,
          type: 'expense',
          is_paid: true,
          due_date: '2026-08-10',
          category: { name: 'Mercado', color: '#f97316' },
        },
        {
          amount: 500,
          type: 'expense',
          is_paid: true,
          due_date: '2026-09-10',
          category: { name: 'Mercado', color: '#f97316' },
        },
        {
          amount: 750,
          type: 'expense',
          is_paid: true,
          due_date: '2026-10-10',
          category: { name: 'Mercado', color: '#f97316' },
        },
      ],
      2026
    );

    // Outubro = index 9
    const metricsOct = computeCategoryEvolutionMetrics(expenseCategories[0], 9, 'realized');
    expect(metricsOct.currentValue).toBe(750);
    expect(metricsOct.previousValue).toBe(500);
    expect(metricsOct.momDelta).toBe(250);
    expect(metricsOct.momPct).toBeCloseTo(50, 1); // +50% vs Setembro
    expect(metricsOct.yearlyTotal).toBe(1650);
    expect(metricsOct.activeMonthsCount).toBe(3);
    expect(metricsOct.monthlyAverage).toBe(550); // (400 + 500 + 750) / 3
    expect(metricsOct.averageStatus).toBe('above');
    expect(metricsOct.vsAverageDelta).toBe(200);

    // Agosto = index 7 (400 vs média 550 -> below)
    const metricsAug = computeCategoryEvolutionMetrics(expenseCategories[0], 7, 'realized');
    expect(metricsAug.currentValue).toBe(400);
    expect(metricsAug.averageStatus).toBe('below');
  });

  it('compares variable income categories (e.g. Barbearia) against the average accumulated up to the same day of other months', () => {
    const { incomeCategories } = buildYearlyCategoryEvolution(
      [
        // Agosto: R$ 2.800 até dia 20, + R$ 1.400 no dia 28 (Total mês = R$ 4.200)
        {
          amount: 2800,
          type: 'income',
          is_paid: true,
          due_date: '2026-08-15',
          description: 'Atendimento: Cortes Agosto 1a quinzena',
        },
        {
          amount: 1400,
          type: 'income',
          is_paid: true,
          due_date: '2026-08-28',
          description: 'Atendimento: Cortes Agosto final do mês',
        },
        // Setembro: R$ 3.000 até dia 20, + R$ 1.500 no dia 29 (Total mês = R$ 4.500)
        {
          amount: 3000,
          type: 'income',
          is_paid: true,
          due_date: '2026-09-18',
          description: 'Atendimento: Cortes Setembro até dia 20',
        },
        {
          amount: 1500,
          type: 'income',
          is_paid: true,
          due_date: '2026-09-29',
          description: 'Atendimento: Cortes Setembro final do mês',
        },
        // Outubro (mês atual em andamento, dia 20): R$ 3.190 até dia 20
        {
          amount: 3190,
          type: 'income',
          is_paid: true,
          due_date: '2026-10-19',
          description: 'Atendimento: Cortes Outubro até dia 20',
        },
      ],
      2026
    );

    // Simulando referência em 20 de Outubro de 2026 (month index 9, day 20)
    const metricsOct = computeCategoryEvolutionMetrics(
      incomeCategories[0],
      9,
      'realized',
      {
        referenceDate: new Date(2026, 9, 20),
        selectedYear: 2026,
      }
    );

    expect(metricsOct.isVariable).toBe(true);
    expect(metricsOct.isSameDayComparison).toBe(true);
    expect(metricsOct.comparisonCutoffDay).toBe(20);
    // Média até dia 20 dos outros meses (Agosto = 2800, Setembro = 3000) -> 2900
    expect(metricsOct.monthlyAverage).toBe(2900);
    // Apesar de 3190 ser menor que os meses inteiros (4200 e 4500), até o dia 20 está 10% ACIMA da média (2900)!
    expect(metricsOct.averageStatus).toBe('above');
    expect(metricsOct.vsAveragePct).toBeCloseTo(10, 1);
    // Comparação com mês anterior até dia 20 (Setembro até dia 20 = 3000) -> +190
    expect(metricsOct.previousValue).toBe(3000);
    expect(metricsOct.momDelta).toBe(190);
  });
});


