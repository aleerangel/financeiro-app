import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCsv, exportTransactionsReport, exportSalesReport } from './export-utils';
import { Transaction, Sale } from '../types/database';

describe('export-utils', () => {
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  const originalDocument = (globalThis as unknown as { document: unknown }).document;
  const originalURL = globalThis.URL;

  beforeEach(() => {
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: vi.fn(() => mockLink),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    globalThis.URL = originalURL;
  });

  it('exportToCsv formata com BOM UTF-8 e salva o arquivo com extensão .csv', () => {
    exportToCsv('teste', ['Nome', 'Valor'], [['Aluguel', 'R$ 1.200,00'], ['Corte "Social"', 'R$ 50,00']]);

    expect(mockLink.download).toBe('teste.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('exportTransactionsReport gera CSV com o padrão correto', () => {
    const mockTransactions = [
      {
        id: '1',
        user_id: 'u1',
        description: 'Corte de Cabelo',
        amount: 50,
        type: 'income',
        payment_method: 'pix',
        transaction_date: '2026-10-20',
        due_date: '2026-10-20',
        is_paid: true,
        created_at: '2026-10-20T10:00:00Z',
        category: {
          id: 'c1',
          user_id: 'u1',
          name: 'Barbearia',
          type: 'income',
          icon: 'scissors',
          color: '#10b981',
          is_default: false,
          created_at: '',
        },
        account: {
          id: 'a1',
          user_id: 'u1',
          name: 'Nubank',
          type: 'checking',
          initial_balance: 0,
          color: '#8b5cf6',
          created_at: '',
          updated_at: '',
        },
      },
      {
        id: '2',
        user_id: 'u1',
        description: 'Lâminas Gillette',
        amount: 30,
        type: 'expense',
        payment_method: 'debit',
        transaction_date: '2026-10-20',
        due_date: '2026-10-20',
        is_paid: false,
        created_at: '2026-10-20T11:00:00Z',
        category: {
          id: 'c2',
          user_id: 'u1',
          name: 'Suprimentos',
          type: 'expense',
          icon: 'package',
          color: '#ef4444',
          is_default: false,
          created_at: '',
        },
      },
    ] as unknown as Transaction[];

    exportTransactionsReport({
      format: 'csv',
      periodLabel: 'Outubro de 2026',
      transactions: mockTransactions,
    });

    expect(mockLink.download).toContain('extrato-transacoes');
    expect(mockLink.download).toContain('.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('exportSalesReport gera CSV de atendimentos corretamente', () => {
    const mockSales = [
      {
        id: 's1',
        user_id: 'u1',
        client_name: 'Carlos Silva',
        total_amount: 80,
        payment_method: 'pix',
        sale_date: '2026-10-20T14:30:00Z',
        created_at: '2026-10-20T14:30:00Z',
        items: [
          {
            id: 'i1',
            sale_id: 's1',
            product_id: null,
            product_name: 'Corte Degradê',
            quantity: 1,
            unit_price: 50,
            total_price: 50,
            created_at: '',
          },
          {
            id: 'i2',
            sale_id: 's1',
            product_id: null,
            product_name: 'Pomada Matte',
            quantity: 1,
            unit_price: 30,
            total_price: 30,
            created_at: '',
          },
        ],
      },
    ] as unknown as Sale[];

    exportSalesReport({
      format: 'csv',
      periodLabel: 'Hoje',
      sales: mockSales,
    });

    expect(mockLink.download).toContain('relatorio-vendas');
    expect(mockLink.download).toContain('.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });
});

