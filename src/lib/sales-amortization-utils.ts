import { Sale, SaleStatus } from '@/types/database';
import { getZonedYMD } from './date-utils';

/**
 * Calcula o saldo restante com proteção contra arredondamentos de ponto flutuante
 */
export function calculateRemainingBalance(totalAmount: number, paidAmount: number): number {
  const diff = Number((totalAmount - paidAmount).toFixed(2));
  return Math.max(0, diff);
}

/**
 * Define o status da venda a prazo conforme o valor amortizado
 */
export function resolveSaleStatus(totalAmount: number, paidAmount: number): SaleStatus {
  const remaining = calculateRemainingBalance(totalAmount, paidAmount);
  if (remaining <= 0) return 'paid';
  if (paidAmount > 0) return 'partially_paid';
  return 'pending';
}

export interface PendingSaleDebt {
  id: string;
  remaining_amount: number;
  sale_date: string;
}

export interface DebtAllocationItem {
  saleId: string;
  amountAllocated: number;
  newRemaining: number;
  status: SaleStatus;
}

/**
 * Distribui um valor de amortização consolidado entre comandas em aberto via FIFO (mais antigas primeiro)
 */
export function allocateDebtAmortization(
  amountToAmortize: number,
  pendingSales: PendingSaleDebt[]
): DebtAllocationItem[] {
  if (amountToAmortize <= 0) return [];

  // Ordena por data de venda crescente (mais antigas primeiro)
  const sorted = [...pendingSales].sort(
    (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  );

  let remainingToDistribute = Number(amountToAmortize.toFixed(2));
  const allocations: DebtAllocationItem[] = [];

  for (const s of sorted) {
    if (remainingToDistribute <= 0) break;
    const currentRem = Number(s.remaining_amount) || 0;
    if (currentRem <= 0) continue;

    const allocated = Number(Math.min(remainingToDistribute, currentRem).toFixed(2));
    const newRem = Number((currentRem - allocated).toFixed(2));
    const status: SaleStatus = newRem <= 0 ? 'paid' : 'partially_paid';

    allocations.push({
      saleId: s.id,
      amountAllocated: allocated,
      newRemaining: newRem,
      status,
    });

    remainingToDistribute = Number((remainingToDistribute - allocated).toFixed(2));
  }

  return allocations;
}

/**
 * Calcula o faturamento real em dinheiro recebido hoje (regime de caixa)
 * somando apenas vendas à vista de hoje e amortizações/entradas pagas hoje.
 */
export function calculateTodayCashSummary(params: {
  sales: Sale[];
  todayAmortizations: { amount: number; amortized_at: string }[];
  todayDateStr: string;
}): {
  todayCashReceived: number;
  todayOnCreditIssued: number;
} {
  const { sales, todayAmortizations, todayDateStr } = params;

  // Vendas de hoje
  const todaySales = sales.filter((s) => s.sale_date && getZonedYMD(s.sale_date) === todayDateStr);

  // Vendas à vista de hoje (dinheiro real de vendas não a prazo)
  const todayCashSales = todaySales
    .filter((s) => s.payment_method !== 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

  // Amortizações que caíram hoje (entradas de fiados feitas hoje)
  const todayAmortizationsSum = todayAmortizations
    .filter((a) => a.amortized_at && getZonedYMD(a.amortized_at) === todayDateStr)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Faturamento recebido efetivo (caixa)
  const todayCashReceived = Number((todayCashSales + todayAmortizationsSum).toFixed(2));

  // Fiados emitidos hoje (saldo devedor gerado no dia)
  const todayOnCreditIssued = Number(
    todaySales
      .filter((s) => s.payment_method === 'on_credit')
      .reduce((acc, curr) => acc + Number(curr.remaining_amount ?? curr.total_amount ?? 0), 0)
      .toFixed(2)
  );

  return {
    todayCashReceived,
    todayOnCreditIssued,
  };
}

