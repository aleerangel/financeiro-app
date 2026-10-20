import { describe, it, expect } from 'vitest';
import {
  filterTransactionsList,
  groupTransactionsByDay,
} from './transaction-filter-utils';
import { Transaction } from '@/types/database';

const MOCK_TXS: Transaction[] = [
  {
    id: '1',
    user_id: 'u1',
    description: 'Atendimento: Carlos (Corte)',
    amount: 45,
    type: 'income',
    payment_method: 'pix',
    transaction_date: '2026-10-15',
    due_date: '2026-10-15',
    category_id: 'cat-barb',
    account_id: 'acc-1',
    credit_card_id: null,
    recurrence_id: null,
    installment_group_id: null,
    current_installment: 1,
    total_installments: 1,
    is_paid: true,
    paid_at: '2026-10-15T14:00:00Z',
    notes: null,
    created_at: '2026-10-15T14:00:00Z',
    updated_at: '2026-10-15T14:00:00Z',
    category: {
      id: 'cat-barb',
      user_id: 'u1',
      name: 'Barbearia',
      type: 'income',
      color: '#10b981',
      icon: 'scissors',
      is_default: true,
      created_at: '2026-10-01T00:00:00Z',
    },
  },
  {
    id: '2',
    user_id: 'u1',
    description: 'Supermercado Assaí',
    amount: 320,
    type: 'expense',
    payment_method: 'credit',
    transaction_date: '2026-10-15',
    due_date: '2026-10-15',
    category_id: 'cat-alim',
    account_id: null,
    credit_card_id: 'card-1',
    recurrence_id: null,
    installment_group_id: null,
    current_installment: 1,
    total_installments: 1,
    is_paid: false,
    paid_at: null,
    notes: 'Compras do mês',
    created_at: '2026-10-15T18:00:00Z',
    updated_at: '2026-10-15T18:00:00Z',
    category: {
      id: 'cat-alim',
      user_id: 'u1',
      name: 'Alimentação',
      type: 'expense',
      color: '#f43f5e',
      icon: 'utensils',
      is_default: false,
      created_at: '2026-10-01T00:00:00Z',
    },
  },
  {
    id: '3',
    user_id: 'u1',
    description: 'Conta de Energia',
    amount: 180,
    type: 'expense',
    payment_method: 'pix',
    transaction_date: '2026-10-10',
    due_date: '2026-10-10',
    category_id: 'cat-casa',
    account_id: 'acc-1',
    credit_card_id: null,
    recurrence_id: null,
    installment_group_id: null,
    current_installment: 1,
    total_installments: 1,
    is_paid: true,
    paid_at: '2026-10-10T10:00:00Z',
    notes: null,
    created_at: '2026-10-10T10:00:00Z',
    updated_at: '2026-10-10T10:00:00Z',
  },
];

describe('transaction-filter-utils', () => {
  it('filters by scope, source, category, and search query', () => {
    const bizOnly = filterTransactionsList(MOCK_TXS, {
      filter: 'business',
      searchTerm: '',
      selectedCategoryId: 'all',
      selectedSourceId: 'all',
    });
    expect(bizOnly.map((t) => t.id)).toEqual(['1']);

    const cardOnly = filterTransactionsList(MOCK_TXS, {
      filter: 'all',
      searchTerm: 'assaí',
      selectedCategoryId: 'cat-alim',
      selectedSourceId: 'card:card-1',
    });
    expect(cardOnly.map((t) => t.id)).toEqual(['2']);
  });

  it('groups transactions by day descending with income and expense subtotals', () => {
    const groups = groupTransactionsByDay(MOCK_TXS);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-10-15');
    expect(groups[0].incomeTotal).toBe(45);
    expect(groups[0].expenseTotal).toBe(320);
    expect(groups[1].date).toBe('2026-10-10');
    expect(groups[1].expenseTotal).toBe(180);
  });
});
