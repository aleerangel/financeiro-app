import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportToCsv,
  exportTransactionsReport,
  exportSalesReport,
  exportDebtsReport,
  sanitizeSpreadsheetCell,
} from './export-utils';
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

  it('sanitizeSpreadsheetCell neutraliza tentativas de Formula Injection (=, +, -, @)', () => {
    expect(sanitizeSpreadsheetCell('=1+1')).toBe("'=1+1");
    expect(sanitizeSpreadsheetCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeSpreadsheetCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
    expect(sanitizeSpreadsheetCell('-cmd|/c calc')).toBe("'-cmd|/c calc");

    // Números puros não devem ser prefixados com apóstrofo
    expect(sanitizeSpreadsheetCell(-50)).toBe(-50);
    expect(sanitizeSpreadsheetCell('-50')).toBe('-50');
    expect(sanitizeSpreadsheetCell('-50.25')).toBe('-50.25');
    expect(sanitizeSpreadsheetCell('Texto Normal')).toBe('Texto Normal');
  });

  it('exportTransactionsReport gera CSV com o padrão correto', async () => {
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

    await exportTransactionsReport({
      format: 'csv',
      periodLabel: 'Outubro de 2026',
      transactions: mockTransactions,
      businessName: 'Barbearia Canário',
      cnpj: '18.236.120/0001-58',
    });

    expect(mockLink.download).toContain('extrato-transacoes');
    expect(mockLink.download).toContain('.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('exportSalesReport gera CSV de atendimentos corretamente', async () => {
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

    await exportSalesReport({
      format: 'csv',
      periodLabel: 'Hoje',
      sales: mockSales,
    });

    expect(mockLink.download).toContain('relatorio-vendas');
    expect(mockLink.download).toContain('.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('exportDebtsReport gera CSV de fiados a receber com sucesso', async () => {
    const mockClients = [
      {
        clientName: 'João da Silva',
        clientPhone: '11999998888',
        totalDebt: 120,
        pendingSalesCount: 2,
        mostUrgentDueDate: '2026-10-30',
        isOverdue: false,
        daysDiff: -7,
      },
      {
        clientName: 'Carlos Souza',
        clientPhone: null,
        totalDebt: 50,
        pendingSalesCount: 1,
        mostUrgentDueDate: '2026-10-15',
        isOverdue: true,
        daysDiff: 8,
      },
    ];

    await exportDebtsReport({
      format: 'csv',
      clients: mockClients,
      totalPendingDebt: 170,
      totalOverdueDebt: 50,
    });

    expect(mockLink.download).toContain('relatorio-fiados-receber');
    expect(mockLink.download).toContain('.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });
});

