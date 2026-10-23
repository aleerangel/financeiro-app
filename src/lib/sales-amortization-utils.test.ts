import { describe, it, expect } from 'vitest';
import {
  calculateRemainingBalance,
  resolveSaleStatus,
  allocateDebtAmortization,
  calculateTodayCashSummary,
} from './sales-amortization-utils';
import { Sale } from '@/types/database';

describe('sales-amortization-utils', () => {
  describe('calculateRemainingBalance', () => {
    it('calcula o saldo restante corretamente', () => {
      expect(calculateRemainingBalance(100, 40)).toBe(60);
      expect(calculateRemainingBalance(55.5, 20.2)).toBe(35.3);
      expect(calculateRemainingBalance(80, 80)).toBe(0);
      expect(calculateRemainingBalance(80, 90)).toBe(0); // Não deve negativar
    });
  });

  describe('resolveSaleStatus', () => {
    it('retorna "pending" quando nada foi pago', () => {
      expect(resolveSaleStatus(100, 0)).toBe('pending');
    });

    it('retorna "partially_paid" quando pago parcialmente', () => {
      expect(resolveSaleStatus(100, 40)).toBe('partially_paid');
    });

    it('retorna "paid" quando totalmente quitado', () => {
      expect(resolveSaleStatus(100, 100)).toBe('paid');
      expect(resolveSaleStatus(50, 60)).toBe('paid');
    });
  });

  describe('allocateDebtAmortization (FIFO)', () => {
    const pendingSales = [
      { id: 'sale-1', remaining_amount: 40, sale_date: '2026-10-10T14:00:00Z' },
      { id: 'sale-2', remaining_amount: 60, sale_date: '2026-10-15T15:00:00Z' },
      { id: 'sale-3', remaining_amount: 50, sale_date: '2026-10-20T10:00:00Z' },
    ];

    it('distribui a amortização quitando a mais antiga primeiro', () => {
      // Amortiza R$ 50: deve quitar a comanda 1 (R$ 40) e abater R$ 10 da comanda 2
      const result = allocateDebtAmortization(50, pendingSales);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        saleId: 'sale-1',
        amountAllocated: 40,
        newRemaining: 0,
        status: 'paid',
      });
      expect(result[1]).toEqual({
        saleId: 'sale-2',
        amountAllocated: 10,
        newRemaining: 50,
        status: 'partially_paid',
      });
    });

    it('quita múltiplas comandas se o valor for suficiente', () => {
      // Amortiza R$ 120: quita sale-1 (40), quita sale-2 (60) e abate 20 de sale-3 (restam 30)
      const result = allocateDebtAmortization(120, pendingSales);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('paid');
      expect(result[1].status).toBe('paid');
      expect(result[2].amountAllocated).toBe(20);
      expect(result[2].newRemaining).toBe(30);
      expect(result[2].status).toBe('partially_paid');
    });

    it('retorna array vazio quando valor for zero ou negativo', () => {
      expect(allocateDebtAmortization(0, pendingSales)).toEqual([]);
      expect(allocateDebtAmortization(-10, pendingSales)).toEqual([]);
    });
  });

  describe('calculateTodayCashSummary', () => {
    const mockSales: Sale[] = [
      // Venda 1: À vista hoje no Pix (R$ 50)
      {
        id: '1',
        user_id: 'u1',
        client_name: 'Carlos',
        total_amount: 50,
        payment_method: 'pix',
        account_id: 'acc1',
        transaction_id: 'tx1',
        sale_date: '2026-10-23T10:00:00-03:00',
        status: 'paid',
        paid_amount: 50,
        remaining_amount: 0,
        notes: null,
        created_at: '2026-10-23T10:00:00-03:00',
      },
      // Venda 2: A prazo criada hoje de R$ 80 (não entra no caixa hoje!)
      {
        id: '2',
        user_id: 'u1',
        client_name: 'Marcos',
        total_amount: 80,
        payment_method: 'on_credit',
        account_id: 'acc1',
        transaction_id: null,
        sale_date: '2026-10-23T11:00:00-03:00',
        status: 'pending',
        paid_amount: 0,
        remaining_amount: 80,
        notes: null,
        created_at: '2026-10-23T11:00:00-03:00',
      },
      // Venda 3: Venda de ontem à vista (R$ 70) - não conta hoje
      {
        id: '3',
        user_id: 'u1',
        client_name: 'João',
        total_amount: 70,
        payment_method: 'cash',
        account_id: 'acc1',
        transaction_id: 'tx3',
        sale_date: '2026-10-22T10:00:00-03:00',
        status: 'paid',
        paid_amount: 70,
        remaining_amount: 0,
        notes: null,
        created_at: '2026-10-22T10:00:00-03:00',
      },
    ];

    const mockAmortizations = [
      // Amortização recebida hoje de R$ 30 referente a uma comanda antiga
      { amount: 30, amortized_at: '2026-10-23T15:30:00-03:00' },
      // Amortização recebida ontem de R$ 20 (não conta hoje)
      { amount: 20, amortized_at: '2026-10-22T12:00:00-03:00' },
    ];

    it('calcula o caixa líquido recebido hoje (à vista + amortizações) sem inflar com fiados pendentes', () => {
      const summary = calculateTodayCashSummary({
        sales: mockSales,
        todayAmortizations: mockAmortizations,
        todayDateStr: '2026-10-23',
      });

      // Caixa recebido hoje: R$ 50 (venda à vista) + R$ 30 (amortização paga hoje) = R$ 80
      expect(summary.todayCashReceived).toBe(80);
      // Vendido a prazo hoje: R$ 80 (da comanda do Marcos)
      expect(summary.todayOnCreditIssued).toBe(80);
    });
  });
});

