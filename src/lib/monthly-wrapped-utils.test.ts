import { describe, it, expect } from 'vitest';
import {
  computeSavingsRate,
  computePercentageGrowth,
  determineMonthTitle,
  buildMonthlyWrappedData,
} from './monthly-wrapped-utils';
import { Transaction } from '@/types/database';

describe('monthly-wrapped-utils', () => {
  it('computes savings rate accurately', () => {
    expect(computeSavingsRate(10000, 6000)).toBe(40);
    expect(computeSavingsRate(5000, 5000)).toBe(0);
    expect(computeSavingsRate(3000, 4000)).toBe(0);
    expect(computeSavingsRate(0, 100)).toBe(0);
  });

  it('computes percentage growth correctly vs previous month', () => {
    expect(computePercentageGrowth(1200, 1000)).toBe(20);
    expect(computePercentageGrowth(800, 1000)).toBe(-20);
    expect(computePercentageGrowth(500, null)).toBeNull();
    expect(computePercentageGrowth(500, 0)).toBeNull();
  });

  it('determines fun and encouraging month titles based on savings and balance', () => {
    // Superávit alto
    const mestre = determineMonthTitle(4000, 40, 10000);
    expect(mestre.title).toBe('Mestre da Poupança');
    expect(mestre.badge).toBe('🏆');

    // Equilíbrio
    const equilibrado = determineMonthTitle(2000, 20, 10000);
    expect(equilibrado.title).toBe('Equilíbrio Total');
    expect(equilibrado.badge).toBe('⚖️');

    // Positivo com pouco poupado
    const positivo = determineMonthTitle(500, 5, 10000);
    expect(positivo.title).toBe('No Azul com Emoção');
    expect(positivo.badge).toBe('🎯');

    // Negativo
    const desafiador = determineMonthTitle(-800, 0, 5000);
    expect(desafiador.title).toBe('Mês Desafiador');
    expect(desafiador.badge).toBe('🥊');
  });

  it('aggregates transactions, categories, and business sales into wrapped structure', () => {
    const currentTxs: Partial<Transaction>[] = [
      {
        id: '1',
        description: 'Salário',
        amount: 5000,
        type: 'income',
        is_paid: true,
        payment_method: 'pix',
        transaction_date: '2026-10-05',
        due_date: '2026-10-05',
      },
      {
        id: '2',
        description: 'Supermercado Mensal',
        amount: 1500,
        type: 'expense',
        is_paid: true,
        payment_method: 'credit',
        transaction_date: '2026-10-10',
        due_date: '2026-10-20',
        category: { id: 'cat-1', name: 'Alimentação', color: '#f59e0b', type: 'expense', is_default: false, user_id: 'u1', created_at: '' },
      },
      {
        id: '3',
        description: 'Rendimento Nubank',
        amount: 45.5,
        type: 'income',
        is_paid: true,
        payment_method: 'transfer',
        transaction_date: '2026-10-30',
        due_date: '2026-10-30',
        notes: '[Rendimento] Juros automáticos',
      },
      {
        id: '4',
        description: 'Aluguel',
        amount: 1200,
        type: 'expense',
        is_paid: true,
        payment_method: 'pix',
        transaction_date: '2026-10-08',
        due_date: '2026-10-10',
        category: { id: 'cat-2', name: 'Moradia', color: '#3b82f6', type: 'expense', is_default: false, user_id: 'u1', created_at: '' },
      },
    ];

    const prevTxs: Partial<Transaction>[] = [
      {
        id: 'p1',
        amount: 4500,
        type: 'income',
        is_paid: true,
      },
      {
        id: 'p2',
        amount: 3000,
        type: 'expense',
        is_paid: true,
      },
    ];

    const data = buildMonthlyWrappedData({
      month: 9, // Outubro (0-indexed)
      year: 2026,
      currentTransactions: currentTxs as Transaction[],
      previousTransactions: prevTxs as Transaction[],
      hasBusiness: true,
      businessName: 'Barbearia Rangel',
      currentSales: [
        {
          id: 's1',
          user_id: 'u1',
          sale_date: '2026-10-15',
          total_amount: 80,
          paid_amount: 80,
          remaining_amount: 0,
          status: 'paid',
          payment_method: 'pix',
          created_at: '',
          updated_at: '',
          client_id: 'c1',
          client: { id: 'c1', user_id: 'u1', name: 'Lorenzzo', phone: '11999999999', cpf: null, notes: null, created_at: '', updated_at: '' },
          items: [
            { product_name: 'Corte Degradê', quantity: 1, unit_price: 50, total_price: 50 },
            { product_name: 'Pomada Matte', quantity: 1, unit_price: 30, total_price: 30 },
          ],
        },
        {
          id: 's2',
          user_id: 'u1',
          sale_date: '2026-10-22',
          total_amount: 50,
          paid_amount: 50,
          remaining_amount: 0,
          status: 'paid',
          payment_method: 'pix',
          created_at: '',
          updated_at: '',
          client_id: 'c1',
          client: { id: 'c1', user_id: 'u1', name: 'Lorenzzo', phone: '11999999999', cpf: null, notes: null, created_at: '', updated_at: '' },
          items: [
            { product_name: 'Corte Degradê', quantity: 1, unit_price: 50, total_price: 50 },
          ],
        },
      ],
    });

    expect(data.monthName).toBe('Outubro');
    expect(data.totalIncome).toBe(5045.5);
    expect(data.totalExpense).toBe(2700);
    expect(data.netBalance).toBe(2345.5);
    expect(data.savingsRate).toBe(46);
    expect(data.monthTitle.title).toBe('Mestre da Poupança');
    expect(data.creditCardTotal).toBe(1500);
    expect(data.accountYieldTotal).toBe(45.5);

    // Maior despesa
    expect(data.largestExpense?.description).toBe('Supermercado Mensal');
    expect(data.largestExpense?.amount).toBe(1500);

    // Categoria campeã
    expect(data.topCategory?.name).toBe('Alimentação');
    expect(data.topCategory?.amount).toBe(1500);

    // Negócio
    expect(data.businessStats).toBeDefined();
    expect(data.businessStats?.totalRevenue).toBe(130);
    expect(data.businessStats?.totalSalesCount).toBe(2);
    expect(data.businessStats?.topProductOrService?.name).toBe('Corte Degradê');
    expect(data.businessStats?.topProductOrService?.quantity).toBe(2);
    expect(data.businessStats?.vipClient?.name).toBe('Lorenzzo');
    expect(data.businessStats?.vipClient?.visitsCount).toBe(2);

    // WhatsApp share text
    expect(data.shareText).toContain('Barbearia Rangel');
    expect(data.shareText).toContain('Mestre da Poupança');
  });
});
