'use server';

import { createClient } from '@/lib/supabase/server';

export interface MonthlyBusinessStat {
  month: number;
  monthLabel: string;
  salesCount: number;
  revenue: number;
}

export interface TopProductStat {
  name: string;
  salesCount: number;
  revenue: number;
  growth: number;
}

export interface RecentBusinessSale {
  id: string;
  client_name: string;
  account_name: string;
  total_amount: number;
  sale_date: string;
}

export interface BusinessDashboardData {
  monthlyStats: MonthlyBusinessStat[];
  topProducts: TopProductStat[];
  recentSales: RecentBusinessSale[];
}

export interface MonthlyGeneralStat {
  month: number;
  monthLabel: string;
  serviceRevenue: number;
  generalIncome: number;
  generalExpense: number;
  netBalance: number;
}

export interface GeneralDashboardData {
  monthlyStats: MonthlyGeneralStat[];
}

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export async function getBusinessDashboardData(year: number, currentMonth: number): Promise<BusinessDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate = `${year}-12-31T23:59:59.999Z`;

  // 1. Vendas do ano com conta
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      client_name,
      total_amount,
      sale_date,
      account:accounts(name),
      items:sale_items(
        product_name,
        quantity,
        total_price
      )
    `)
    .eq('user_id', user.id)
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .order('sale_date', { ascending: false });

  if (salesError || !salesData) {
    console.error('Erro ao buscar dados de vendas do dashboard:', salesError);
  }

  const sales = salesData || [];

  // 2. Mapeia as 12 estatísticas mensais
  const monthlyStats: MonthlyBusinessStat[] = MONTH_LABELS.map((label, idx) => ({
    month: idx,
    monthLabel: label,
    salesCount: 0,
    revenue: 0,
  }));

  // Agrupamento para produtos mais vendidos
  const productAgg = new Map<string, {
    totalQuantity: number;
    totalRevenue: number;
    currentMonthCount: number;
    prevMonthCount: number;
  }>();

  for (const s of sales) {
    const saleDate = new Date(s.sale_date);
    const m = saleDate.getMonth();
    const amount = Number(s.total_amount) || 0;

    if (m >= 0 && m < 12) {
      monthlyStats[m].salesCount += 1;
      monthlyStats[m].revenue += amount;
    }

    // Processa itens
    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        const pName = item.product_name;
        const qty = Number(item.quantity) || 1;
        const price = Number(item.total_price) || 0;

        const current = productAgg.get(pName) || {
          totalQuantity: 0,
          totalRevenue: 0,
          currentMonthCount: 0,
          prevMonthCount: 0,
        };

        current.totalQuantity += qty;
        current.totalRevenue += price;

        if (m === currentMonth) {
          current.currentMonthCount += qty;
        } else if (m === currentMonth - 1) {
          current.prevMonthCount += qty;
        }

        productAgg.set(pName, current);
      }
    }
  }

  // 3. Top 5 Produtos/Serviços
  const topProducts: TopProductStat[] = Array.from(productAgg.entries())
    .map(([name, stat]) => {
      let growth = 0;
      if (stat.prevMonthCount > 0) {
        growth = Math.round(((stat.currentMonthCount - stat.prevMonthCount) / stat.prevMonthCount) * 100);
      } else if (stat.currentMonthCount > 0) {
        growth = 100;
      }
      return {
        name,
        salesCount: stat.totalQuantity,
        revenue: stat.totalRevenue,
        growth,
      };
    })
    .sort((a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue)
    .slice(0, 5);

  // 4. Últimas 5 vendas
  const recentSales: RecentBusinessSale[] = sales.slice(0, 5).map((s) => ({
    id: s.id,
    client_name: s.client_name,
    account_name: (s.account as unknown as { name?: string })?.name || 'Conta Padrão',
    total_amount: Number(s.total_amount) || 0,
    sale_date: s.sale_date,
  }));

  return {
    monthlyStats,
    topProducts,
    recentSales,
  };
}

export async function getGeneralDashboardData(year: number): Promise<GeneralDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Busca transações do ano
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('id, amount, type, is_paid, due_date')
    .eq('user_id', user.id)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (txError) {
    console.error('Erro ao buscar transações anuais:', txError);
  }

  // Busca vendas do ano para saber o saldo de serviços mês a mês
  const salesStartDate = `${year}-01-01T00:00:00.000Z`;
  const salesEndDate = `${year}-12-31T23:59:59.999Z`;

  const { data: salesData } = await supabase
    .from('sales')
    .select('total_amount, sale_date')
    .eq('user_id', user.id)
    .gte('sale_date', salesStartDate)
    .lte('sale_date', salesEndDate);

  const monthlyStats: MonthlyGeneralStat[] = MONTH_LABELS.map((label, idx) => ({
    month: idx,
    monthLabel: label,
    serviceRevenue: 0,
    generalIncome: 0,
    generalExpense: 0,
    netBalance: 0,
  }));

  // Soma vendas (serviços)
  if (salesData) {
    for (const s of salesData) {
      const m = new Date(s.sale_date).getMonth();
      if (m >= 0 && m < 12) {
        monthlyStats[m].serviceRevenue += Number(s.total_amount) || 0;
      }
    }
  }

  // Soma transações gerais
  if (txData) {
    for (const t of txData) {
      if (!t.due_date) continue;
      const m = parseInt(t.due_date.split('-')[1], 10) - 1;
      const amt = Number(t.amount) || 0;

      if (m >= 0 && m < 12) {
        if (t.type === 'income') {
          monthlyStats[m].generalIncome += amt;
        } else if (t.type === 'expense') {
          monthlyStats[m].generalExpense += amt;
        }
      }
    }
  }

  for (const stat of monthlyStats) {
    stat.netBalance = stat.generalIncome - stat.generalExpense;
  }

  return {
    monthlyStats,
  };
}
