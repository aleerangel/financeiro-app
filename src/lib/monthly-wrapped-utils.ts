import { Transaction, Sale, Client } from '@/types/database';
import { formatCurrency } from './utils';

export interface MonthlyWrappedData {
  month: number;
  year: number;
  monthName: string;
  hasBusiness: boolean;
  businessName: string;

  // Slide 1: Veredito Geral
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number; // percentual poupado da renda (0 a 100)
  previousMonthNetBalance: number | null;
  balanceGrowthPercent: number | null;
  monthTitle: {
    title: string;
    badge: string;
    description: string;
    color: string;
  };

  // Slide 2: Raio-X dos Gastos
  topCategory: {
    name: string;
    color: string;
    amount: number;
    percentage: number;
  } | null;
  topCategories: Array<{
    name: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
  largestExpense: {
    description: string;
    amount: number;
    date: string;
    categoryName?: string;
  } | null;
  previousMonthExpense: number | null;
  expenseChangePercent: number | null;

  // Slide 3: Negócio / Barbearia (se hasBusiness)
  businessStats?: {
    totalRevenue: number;
    totalSalesCount: number;
    previousRevenue: number | null;
    revenueGrowthPercent: number | null;
    topProductOrService: {
      name: string;
      quantity: number;
      revenue: number;
      type: 'service' | 'product';
    } | null;
    vipClient: {
      id: string;
      name: string;
      visitsCount: number;
      totalSpent: number;
    } | null;
    busiestDayOfWeek: {
      name: string;
      count: number;
    } | null;
  };

  // Slide 4: Cartão & Rendimentos
  creditCardTotal: number;
  accountYieldTotal: number;

  // WhatsApp Share text
  shareText: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month] || '';
}

export function computeSavingsRate(income: number, expense: number): number {
  if (income <= 0) return 0;
  const saved = income - expense;
  if (saved <= 0) return 0;
  return Math.round((saved / income) * 100);
}

export function computePercentageGrowth(current: number, previous: number | null): number | null {
  if (previous === null || previous === undefined || Math.abs(previous) < 0.001) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function determineMonthTitle(netBalance: number, savingsRate: number, totalIncome: number): {
  title: string;
  badge: string;
  description: string;
  color: string;
} {
  if (totalIncome <= 0 && netBalance <= 0) {
    return {
      title: 'Mês de Recomeço',
      badge: '🌱',
      description: 'Pouca movimentação de entrada, mas todo mês é uma nova oportunidade de alavancar!',
      color: '#a1a1aa',
    };
  }

  if (netBalance < 0) {
    return {
      title: 'Mês Desafiador',
      badge: '🥊',
      description: 'As despesas deram um aperto, mas com foco o próximo mês vai ser de recuperação!',
      color: '#f43f5e',
    };
  }

  if (savingsRate >= 35) {
    return {
      title: 'Mestre da Poupança',
      badge: '🏆',
      description: `Espetacular! Você guardou ${savingsRate}% de tudo o que entrou. O seu cofrinho agradece!`,
      color: '#10b981',
    };
  }

  if (savingsRate >= 15) {
    return {
      title: 'Equilíbrio Total',
      badge: '⚖️',
      description: `Contas pagas e ainda sobraram ${savingsRate}% no bolso. Finanças nos trilhos!`,
      color: '#06b6d4',
    };
  }

  return {
    title: 'No Azul com Emoção',
    badge: '🎯',
    description: 'Fechou o mês positivo! Um pequeno ajuste nas despesas e no próximo vai sobrar ainda mais.',
    color: '#8b5cf6',
  };
}

export interface RawSaleItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface RawSaleWithClient extends Omit<Sale, 'items'> {
  client?: Client | null;
  items?: RawSaleItem[];
}

export function buildMonthlyWrappedData(params: {
  month: number;
  year: number;
  currentTransactions: Transaction[];
  previousTransactions: Transaction[];
  currentSales?: RawSaleWithClient[];
  previousSales?: RawSaleWithClient[];
  hasBusiness: boolean;
  businessName?: string;
}): MonthlyWrappedData {
  const {
    month,
    year,
    currentTransactions,
    previousTransactions,
    currentSales = [],
    previousSales = [],
    hasBusiness,
    businessName = 'Meu Negócio',
  } = params;

  const monthName = getMonthName(month);

  // 1. Receitas e Despesas do Mês Atual (Apenas transações pagas)
  const paidTxs = currentTransactions.filter((t) => t.is_paid);
  let totalIncome = 0;
  let totalExpense = 0;
  let creditCardTotal = 0;
  let accountYieldTotal = 0;

  const categoryMap = new Map<string, { name: string; color: string; amount: number }>();
  let largestExpense: { description: string; amount: number; date: string; categoryName?: string } | null = null;

  for (const t of paidTxs) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      // Verifica rendimentos
      const notes = t.notes || '';
      const desc = (t.description || '').toLowerCase();
      if (notes.includes('[Rendimento]') || desc.startsWith('rendimento:') || desc.startsWith('rendimento ') || desc.startsWith('juros:')) {
        accountYieldTotal += amt;
      }
    } else if (t.type === 'expense') {
      totalExpense += amt;

      if (t.payment_method === 'credit' || t.credit_card_id) {
        creditCardTotal += amt;
      }

      // Maior despesa
      if (!largestExpense || amt > largestExpense.amount) {
        largestExpense = {
          description: t.description,
          amount: amt,
          date: t.paid_at ? t.paid_at.slice(0, 10) : (t.transaction_date || t.due_date),
          categoryName: t.category?.name,
        };
      }

      // Agrupamento por Categoria
      const catId = t.category?.id || 'outros';
      const catName = t.category?.name || 'Outras Despesas';
      const catColor = t.category?.color || '#a1a1aa';
      const existing = categoryMap.get(catId) || { name: catName, color: catColor, amount: 0 };
      existing.amount += amt;
      categoryMap.set(catId, existing);
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  creditCardTotal = Math.round(creditCardTotal * 100) / 100;
  accountYieldTotal = Math.round(accountYieldTotal * 100) / 100;

  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;
  const savingsRate = computeSavingsRate(totalIncome, totalExpense);

  // 2. Transações do Mês Anterior para Comparação
  const prevPaidTxs = previousTransactions.filter((t) => t.is_paid);
  let prevIncome = 0;
  let prevExpense = 0;
  for (const t of prevPaidTxs) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') prevIncome += amt;
    else if (t.type === 'expense') prevExpense += amt;
  }
  const previousMonthNetBalance = prevPaidTxs.length > 0 ? Math.round((prevIncome - prevExpense) * 100) / 100 : null;
  const balanceGrowthPercent = computePercentageGrowth(netBalance, previousMonthNetBalance);

  const previousMonthExpense = prevPaidTxs.length > 0 ? Math.round(prevExpense * 100) / 100 : null;
  const expenseChangePercent = computePercentageGrowth(totalExpense, previousMonthExpense);

  const monthTitle = determineMonthTitle(netBalance, savingsRate, totalIncome);

  // 3. Categorias Ordenadas
  const sortedCategories = Array.from(categoryMap.values())
    .map((c) => ({
      name: c.name,
      color: c.color,
      amount: Math.round(c.amount * 100) / 100,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = sortedCategories[0] || null;

  // 4. Estatísticas do Negócio / Barbearia (se aplicável)
  let businessStats: MonthlyWrappedData['businessStats'] = undefined;

  if (hasBusiness) {
    const totalRevenue = Math.round(currentSales.reduce((acc, s) => acc + Number(s.paid_amount || s.total_amount || 0), 0) * 100) / 100;
    const totalSalesCount = currentSales.length;

    const previousRevenue = previousSales.length > 0
      ? Math.round(previousSales.reduce((acc, s) => acc + Number(s.paid_amount || s.total_amount || 0), 0) * 100) / 100
      : null;
    const revenueGrowthPercent = computePercentageGrowth(totalRevenue, previousRevenue);

    // Produto ou Serviço mais vendido
    const productStatsMap = new Map<string, { name: string; quantity: number; revenue: number; type: 'service' | 'product' }>();
    const clientVisitsMap = new Map<string, { id: string; name: string; visitsCount: number; totalSpent: number }>();
    const weekdayCountMap = new Map<number, number>();

    for (const sale of currentSales) {
      // Dia da semana mais movimentado
      if (sale.sale_date) {
        const dateObj = new Date(`${sale.sale_date}T12:00:00`);
        const dayIdx = dateObj.getDay();
        weekdayCountMap.set(dayIdx, (weekdayCountMap.get(dayIdx) || 0) + 1);
      }

      // Cliente VIP
      if (sale.client_id && sale.client) {
        const cEntry = clientVisitsMap.get(sale.client_id) || {
          id: sale.client_id,
          name: sale.client.name,
          visitsCount: 0,
          totalSpent: 0,
        };
        cEntry.visitsCount += 1;
        cEntry.totalSpent += Number(sale.total_amount || 0);
        clientVisitsMap.set(sale.client_id, cEntry);
      }

      // Itens
      if (sale.items) {
        for (const item of sale.items) {
          const key = item.product_name || 'Item';
          const pEntry = productStatsMap.get(key) || {
            name: key,
            quantity: 0,
            revenue: 0,
            type: key.toLowerCase().includes('corte') || key.toLowerCase().includes('barba') || key.toLowerCase().includes('serviço') ? 'service' : 'product',
          };
          pEntry.quantity += Number(item.quantity) || 1;
          pEntry.revenue += Number(item.total_price) || 0;
          productStatsMap.set(key, pEntry);
        }
      }
    }

    const topProductOrService = Array.from(productStatsMap.values()).sort((a, b) => b.quantity - a.quantity)[0] || null;
    const vipClient = Array.from(clientVisitsMap.values()).sort((a, b) => b.visitsCount - a.visitsCount || b.totalSpent - a.totalSpent)[0] || null;

    let busiestDayOfWeek: { name: string; count: number } | null = null;
    let maxDayCount = 0;
    for (const [dayIdx, count] of weekdayCountMap.entries()) {
      if (count > maxDayCount) {
        maxDayCount = count;
        busiestDayOfWeek = {
          name: WEEKDAY_NAMES[dayIdx],
          count,
        };
      }
    }

    businessStats = {
      totalRevenue,
      totalSalesCount,
      previousRevenue,
      revenueGrowthPercent,
      topProductOrService,
      vipClient,
      busiestDayOfWeek,
    };
  }

  // 5. Montagem do Texto de Compartilhamento WhatsApp
  let shareText = `✨ *Retrospectiva Financeira de ${monthName} de ${year}*\n\n`;
  shareText += `🏅 *Veredito:* ${monthTitle.title} ${monthTitle.badge}\n`;
  shareText += `💰 *Saldo Final:* ${formatCurrency(netBalance)}\n`;
  if (savingsRate > 0) {
    shareText += `📈 *Taxa de Economia:* ${savingsRate}% da renda guardada\n`;
  }
  if (topCategory) {
    shareText += `🏷️ *Maior Gasto:* ${topCategory.name} (${formatCurrency(topCategory.amount)})\n`;
  }

  if (hasBusiness && businessStats) {
    shareText += `\n💈 *${businessName}:*\n`;
    shareText += `• Faturamento: ${formatCurrency(businessStats.totalRevenue)}\n`;
    shareText += `• Atendimentos: ${businessStats.totalSalesCount} clientes\n`;
    if (businessStats.topProductOrService) {
      shareText += `• Campeão de Vendas: ${businessStats.topProductOrService.name} (${businessStats.topProductOrService.quantity}x)\n`;
    }
  }

  shareText += `\n🚀 _Fechamento do mês via Gestão Financeira Inteligente_`;

  return {
    month,
    year,
    monthName,
    hasBusiness,
    businessName,
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    previousMonthNetBalance,
    balanceGrowthPercent,
    monthTitle,
    topCategory,
    topCategories: sortedCategories.slice(0, 3),
    largestExpense,
    previousMonthExpense,
    expenseChangePercent,
    businessStats,
    creditCardTotal,
    accountYieldTotal,
    shareText,
  };
}
