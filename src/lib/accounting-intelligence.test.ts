import { describe, it, expect } from 'vitest';
import { fetchAllPages } from '@/lib/supabase/pagination';

describe('Inteligência Financeira & Regras Contábeis (RN-01 a RN-10)', () => {
  describe('RN-09 / INC-13: Precisão de centavos em compras parceladas', () => {
    function splitInstallmentsExact(amount: number, installments: number): number[] {
      const baseAmount = Math.floor((amount / installments) * 100) / 100;
      const remainderCents = Math.round((amount - baseAmount * installments) * 100) / 100;
      return Array.from({ length: installments }, (_, idx) =>
        idx === 0 ? Math.round((baseAmount + remainderCents) * 100) / 100 : baseAmount
      );
    }

    it('ajusta o resíduo de centavos na 1ª parcela (ex: R$ 100,00 em 3x -> 33,34 + 33,33 + 33,33)', () => {
      const parts = splitInstallmentsExact(100, 3);
      expect(parts).toEqual([33.34, 33.33, 33.33]);
      const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
      expect(sum).toBe(100);
    });

    it('preserva soma exata para divisões em 7x ou 12x', () => {
      const parts7 = splitInstallmentsExact(250, 7);
      const sum7 = Math.round(parts7.reduce((a, b) => a + b, 0) * 100) / 100;
      expect(sum7).toBe(250);

      const parts12 = splitInstallmentsExact(1000, 12);
      const sum12 = Math.round(parts12.reduce((a, b) => a + b, 0) * 100) / 100;
      expect(sum12).toBe(1000);
    });
  });

  describe('RN-08 / INC-08: Cálculo de Dívida Vencida (totalOverdueDebt)', () => {
    it('soma exclusivamente as comandas com due_date < today, sem somar comandas a vencer do mesmo cliente', () => {
      const today = '2026-10-27';
      const clientSales = [
        { id: '1', remaining_amount: 50, due_date: '2026-10-10' }, // vencida
        { id: '2', remaining_amount: 120, due_date: '2026-11-15' }, // a vencer
        { id: '3', remaining_amount: 30, due_date: null }, // sem vencimento
      ];

      const totalDebt = clientSales.reduce((acc, s) => acc + s.remaining_amount, 0);
      const overdueDebt = clientSales
        .filter((s) => Boolean(s.due_date && s.due_date < today))
        .reduce((acc, s) => acc + s.remaining_amount, 0);

      expect(totalDebt).toBe(200);
      expect(overdueDebt).toBe(50);
    });
  });

  describe('RN-02 & RN-03 / INC-02 & INC-05: Faturamento em Regime de Caixa vs Ticket Médio por Competência', () => {
    it('separa Faturamento Recebido (4 fontes de Caixa) do Ticket Médio Bruto (Competência)', () => {
      const monthSales = [
        { total_amount: 100, payment_method: 'pix' }, // R$ 100 à vista
        { total_amount: 200, payment_method: 'on_credit' }, // R$ 200 a prazo (fiado)
      ];
      const amortizationsReceived = [{ amount: 50 }]; // R$ 50 de amortização de fiado
      const clubInvoicesPaid = [{ amount: 90 }]; // R$ 90 de mensalidade do Clube paga
      const manualBusinessTx = [{ amount: 60 }]; // R$ 60 de lançamento manual de negócio

      const cashSalesRev = monthSales
        .filter((s) => s.payment_method !== 'on_credit')
        .reduce((sum, s) => sum + s.total_amount, 0);
      const amortRev = amortizationsReceived.reduce((sum, a) => sum + a.amount, 0);
      const clubRev = clubInvoicesPaid.reduce((sum, i) => sum + i.amount, 0);
      const manualRev = manualBusinessTx.reduce((sum, t) => sum + t.amount, 0);

      const unifiedCashRevenue = cashSalesRev + amortRev + clubRev + manualRev;
      const grossSalesCompetence = monthSales.reduce((sum, s) => sum + s.total_amount, 0);
      const competenceAverageTicket = grossSalesCompetence / monthSales.length;

      expect(unifiedCashRevenue).toBe(300); // 100 + 50 + 90 + 60
      expect(grossSalesCompetence).toBe(300); // 100 + 200
      expect(competenceAverageTicket).toBe(150); // 300 / 2 atendimentos
    });
  });

  describe('RN-10 / INC-16: Peças Inclusas no Serviço, Estoque Mínimo e Ponto de Equilíbrio', () => {
    it('não soma peças inclusas no serviço (is_service_component = true) no valor cobrado do cliente', () => {
      const items = [
        { product_name: 'Manutenção Completa', quantity: 1, unit_price: 150, unit_cost: 0, is_service_component: false },
        { product_name: 'Filtro Inclusivo', quantity: 2, unit_price: 0, unit_cost: 15, is_service_component: true },
      ];

      const clientChargedTotal = items
        .filter((i) => !i.is_service_component)
        .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      const internalMaterialCost = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

      expect(clientChargedTotal).toBe(150);
      expect(internalMaterialCost).toBe(30);
    });

    it('calcula corretamente o Ponto de Equilíbrio (Break-Even) e vendas restantes', () => {
      const revenue = 1200;
      const totalExpenses = 2000;
      const averageTicket = 80;

      const remainingAmount = Math.max(0, totalExpenses - revenue);
      const progressPercent = Math.min(100, Math.round((revenue / totalExpenses) * 100));
      const salesNeeded = Math.ceil(remainingAmount / averageTicket);

      expect(remainingAmount).toBe(800);
      expect(progressPercent).toBe(60);
      expect(salesNeeded).toBe(10);
    });
  });

  describe('RN-05 / INC-04: Utilitário de Paginação Completa (fetchAllPages)', () => {
    it('itera por múltiplas páginas até receber menos itens que pageSize', async () => {
      const pages = [
        Array.from({ length: 3 }, (_, i) => ({ id: i + 1 })),
        Array.from({ length: 3 }, (_, i) => ({ id: i + 4 })),
        Array.from({ length: 1 }, (_, i) => ({ id: i + 7 })),
      ];
      let callCount = 0;

      const result = await fetchAllPages(async () => {
        const data = pages[callCount] || [];
        callCount++;
        return { data, error: null };
      }, 3);

      expect(callCount).toBe(3);
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(7);
      expect(result.data[0].id).toBe(1);
      expect(result.data[6].id).toBe(7);
    });
  });
});
