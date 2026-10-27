'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { fetchAllPages } from '@/lib/supabase/pagination';
import { buildCalendarWeeks, findDefaultWeekIndex } from '@/lib/week-utils';
import {
  isBusinessTransaction,
  computeRevenueSplit,
  type ServiceVsProductSplit,
} from '@/lib/business-scope-utils';
import {
  getZonedParts,
  getZonedRangeBoundsIso,
  getZonedYMD,
  getTodayYMD,
} from '@/lib/date-utils';
import { analyzeClientSales, diffDaysYMD, saleDateToYMD } from '@/lib/client-analytics';
import {
  buildYearlyCategoryEvolution,
  CategoryMonthlyEvolutionItem,
  RawEvolutionTransaction,
} from '@/lib/category-evolution-utils';
import { Transaction } from '@/types/database';
import { ClubMonthlyOverview, getClubMonthlyOverview } from '@/lib/actions/subscriptions';

export interface BusinessPeriodStat {
  label: string; // Ex: 'Jan', '01-07', 'Seg'
  fullLabel: string; // Ex: 'Janeiro de 2026', '01 a 07 de Outubro', 'Segunda-feira (12/10)'
  dateKey?: string;
  month?: number;
  monthLabel?: string;
  salesCount: number;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export type MonthlyBusinessStat = BusinessPeriodStat;

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

export interface RecentBusinessExpense {
  id: string;
  description: string;
  category_name: string;
  category_color: string;
  source_name: string;
  source_type: 'account' | 'card';
  amount: number;
  due_date: string;
  is_paid: boolean;
}

export interface BusinessExpenseSourceStat {
  id: string;
  name: string;
  type: 'account' | 'card';
  color: string;
  paidAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

export interface LowStockProductAlert {
  id: string;
  name: string;
  stockQuantity: number;
  minStock: number;
  stock_quantity: number;
  min_stock: number;
  costPrice: number;
}

export interface BusinessBreakEvenSummary {
  fixedAndOperationalExpenses: number;
  partsAndProductsCost: number;
  totalBreakEvenTarget: number;
  totalExpenses: number;
  currentRevenue: number;
  revenue: number;
  remainingToBreakEven: number;
  remainingAmount: number;
  surplusAfterBreakEven: number;
  surplusAmount: number;
  salesNeeded: number;
  progressPercent: number;
  isReached: boolean;
}

export interface BusinessMonthSummary {
  revenue: number;
  grossSalesRevenue?: number;
  paidExpenses: number;
  pendingExpenses: number;
  totalExpenses: number;
  partsAndProductsCost?: number;
  netProfit: number;
  projectedProfit: number;
  profitMargin: number;
  salesCount: number;
  uniqueClientsCount: number;
  clientReturnRate: number;
  averageTicket: number;
  totalReceivables?: number;
  monthOnCreditRevenue?: number;
  breakEven?: BusinessBreakEvenSummary;
}

export interface TopMonthClient {
  name: string;
  visitsCount: number;
  totalSpent: number;
  lastVisitDate: string;
}

export type { ServiceVsProductSplit } from '@/lib/business-scope-utils';

export interface InactiveClientAlert {
  id: string;
  name: string;
  phone?: string | null;
  daysSinceLastVisit: number;
  lastVisitDate: string;
  totalVisitsAllTime: number;
}

export interface BusinessDashboardData {
  yearlyStats: BusinessPeriodStat[];
  monthlyStats: BusinessPeriodStat[];
  weeklyStatsByWeek: Record<number, BusinessPeriodStat[]>;
  weeksMeta: WeekMeta[];
  defaultWeekIndex: number;
  topProducts: TopProductStat[];
  topClients: TopMonthClient[];
  revenueSplit: ServiceVsProductSplit;
  inactiveClientsAlerts: InactiveClientAlert[];
  lowStockProducts?: LowStockProductAlert[];
  breakEven?: BusinessBreakEvenSummary;
  recentSales: RecentBusinessSale[];
  recentExpenses: RecentBusinessExpense[];
  expensesBySource: BusinessExpenseSourceStat[];
  monthSummary: BusinessMonthSummary;
  clubOverview?: ClubMonthlyOverview;
}

export interface PeriodStat {
  label: string; // Ex: 'Jan', 'Sem 1', 'Seg'
  fullLabel: string; // Ex: 'Janeiro de 2026', 'Semana 1 (01/10 a 07/10)', 'Segunda-feira (12/10)'
  dateKey?: string;
  month?: number;
  monthLabel?: string;
  serviceRevenue: number;
  generalIncome: number;
  generalExpense: number;
  netBalance: number;
  accountBalance: number;
}

export type MonthlyGeneralStat = PeriodStat;

export interface WeekMeta {
  index: number;
  label: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
}

export interface GeneralDashboardData {
  yearlyStats: PeriodStat[];
  monthlyStats: PeriodStat[];
  weeklyStatsByWeek: Record<number, PeriodStat[]>;
  weeksMeta: WeekMeta[];
  defaultWeekIndex: number;
  incomeCategoryEvolution: CategoryMonthlyEvolutionItem[];
  expenseCategoryEvolution: CategoryMonthlyEvolutionItem[];
}

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];


export async function getBusinessDashboardData(year: number, currentMonth: number): Promise<BusinessDashboardData> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Semanas de Domingo a Sábado do mês atual
  const calendarWeeks = buildCalendarWeeks(year, currentMonth);

  // Para que Janeiro calcule corretamente o crescimento em relação a Dezembro do ano anterior (INC-09),
  // estendemos o início da busca de vendas para 01/12 do ano anterior quando currentMonth === 0
  const baseEarliestDate = calendarWeeks.length > 0 && calendarWeeks[0].startDate < startDate
    ? calendarWeeks[0].startDate
    : startDate;
  const earliestDate = currentMonth === 0 ? `${year - 1}-12-01` : baseEarliestDate;
  const latestDate = calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].endDate > endDate
    ? calendarWeeks[calendarWeeks.length - 1].endDate
    : endDate;

  const { startIso: bizSalesStartIso, endIso: bizSalesEndIso } =
    getZonedRangeBoundsIso(earliestDate, latestDate);

  // 1. Busca vendas, amortizações, faturas do clube, transações, clientes, débitos e catálogo em paralelo (com paginação completa — INC-04)
  const currentMonthStr = `${year}-${String(currentMonth + 1).padStart(2, '0')}`;

  type RawSaleRow = {
    id: string;
    client_id: string | null;
    client_name: string;
    total_amount: number;
    paid_amount?: number;
    remaining_amount?: number;
    status?: string;
    payment_method: string;
    due_date?: string | null;
    sale_date: string;
    transaction_id?: string | null;
    account?: { name?: string } | null;
    items?: {
      product_name: string;
      quantity: number;
      total_price: number;
      unit_cost?: number;
      is_service_component?: boolean;
      product?: { type?: string; cost_price?: number } | null;
    }[];
  };

  type RawAmortizationRow = {
    id: string;
    sale_id: string;
    amount: number;
    amortized_at: string;
    transaction_id?: string | null;
  };

  type RawPaidInvoiceRow = {
    id: string;
    amount: number;
    paid_at: string | null;
    due_date: string;
    transaction_id?: string | null;
  };

  const [
    { data: salesData, error: salesError },
    { data: amortizationsData },
    { data: paidInvoicesData },
    { data: txData, error: txError },
    { data: clientsData, error: clientsError },
    { data: pendingSalesData },
    { data: businessRecurrencesData },
    { data: productsCatalogData },
    { data: profileData },
    clubOverview,
  ] = await Promise.all([
    fetchAllPages<RawSaleRow>((from, to) =>
      supabase
        .from('sales')
        .select(`
          id,
          client_id,
          client_name,
          total_amount,
          paid_amount,
          remaining_amount,
          status,
          payment_method,
          due_date,
          sale_date,
          transaction_id,
          account:accounts(name),
          items:sale_items(
            product_name,
            quantity,
            total_price,
            unit_cost,
            is_service_component,
            product:products(type, cost_price)
          )
        `)
        .eq('user_id', user.id)
        .gte('sale_date', bizSalesStartIso)
        .lte('sale_date', bizSalesEndIso)
        .order('sale_date', { ascending: false })
        .range(from, to) as unknown as PromiseLike<{ data: RawSaleRow[] | null; error: { message: string } | null }>
    ),
    fetchAllPages<RawAmortizationRow>((from, to) =>
      supabase
        .from('sale_amortizations')
        .select('id, sale_id, amount, amortized_at, transaction_id')
        .eq('user_id', user.id)
        .gte('amortized_at', bizSalesStartIso)
        .lte('amortized_at', bizSalesEndIso)
        .order('amortized_at', { ascending: false })
        .range(from, to) as unknown as PromiseLike<{ data: RawAmortizationRow[] | null; error: { message: string } | null }>
    ),
    supabase
      .from('subscription_invoices')
      .select('id, amount, paid_at, due_date, transaction_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('due_date', baseEarliestDate)
      .lte('due_date', latestDate),
    fetchAllPages<Transaction>((from, to) =>
      supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts(id, name, color),
          credit_card:credit_cards(id, name, color)
        `)
        .eq('user_id', user.id)
        .gte('due_date', baseEarliestDate)
        .lte('due_date', latestDate)
        .order('due_date', { ascending: false })
        .range(from, to) as unknown as PromiseLike<{ data: Transaction[] | null; error: { message: string } | null }>
    ),
    supabase
      .from('clients')
      .select(`
        id,
        name,
        phone,
        last_contacted_at,
        sales:sales(sale_date, total_amount)
      `)
      .eq('user_id', user.id),
    supabase
      .from('sales')
      .select('remaining_amount')
      .eq('user_id', user.id)
      .in('status', ['pending', 'partially_paid']),
    supabase
      .from('recurrences')
      .select('id, amount, frequency, active, scope, type')
      .eq('user_id', user.id)
      .eq('active', true)
      .eq('type', 'expense'),
    supabase
      .from('products')
      .select('id, name, type, cost_price, stock_quantity, min_stock, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .eq('type', 'product'),
    supabase
      .from('business_profiles')
      .select('default_cycle_days')
      .eq('user_id', user.id)
      .maybeSingle(),
    getClubMonthlyOverview(currentMonthStr).catch(() => undefined),
  ]);

  if (salesError) {
    console.error('Erro ao buscar dados de vendas do dashboard:', salesError);
  }
  if (txError) {
    console.error('Erro ao buscar transações do dashboard:', txError);
  }
  if (clientsError) {
    console.error('Erro ao buscar clientes do dashboard:', clientsError);
  }

  const allSales = salesData || [];
  // Filtra vendas que pertencem ao intervalo do ano atual (ou semanas de borda do mês selecionado)
  const sales = allSales.filter((s) => {
    const dStr = getZonedYMD(s.sale_date);
    return dStr >= baseEarliestDate && dStr <= latestDate;
  });

  const allTransactions = (txData || []).filter(
    (t) => !(t.notes || '').includes('[Ajuste de Saldo]')
  );
  const businessExpenses = allTransactions.filter(
    (t) => t.type === 'expense' && isBusinessTransaction(t)
  );
  const businessIncomes = allTransactions.filter(
    (t) => t.type === 'income' && isBusinessTransaction(t)
  );

  // Coleta IDs de transações geradas automaticamente por vendas, amortizações e mensalidades do clube
  // para evitar dupla contagem ao somar receitas manuais do negócio (RN-02 / INC-02)
  const linkedTxIds = new Set<string>();
  for (const s of allSales) {
    if (s.transaction_id) linkedTxIds.add(s.transaction_id);
  }
  for (const a of amortizationsData || []) {
    if (a.transaction_id) linkedTxIds.add(a.transaction_id);
  }
  for (const inv of (paidInvoicesData as RawPaidInvoiceRow[] | null) || []) {
    if (inv.transaction_id) linkedTxIds.add(inv.transaction_id);
  }

  // Mapeamento diário de despesas pagas do Negócio para os gráficos (considerando a data efetiva do pagamento — RN-07 / INC-12)
  const bizExpenseByDate = new Map<string, number>();
  for (const tx of businessExpenses) {
    if (!tx.is_paid) continue;
    const effectiveDate = tx.paid_at ? getZonedYMD(tx.paid_at) : tx.due_date || tx.transaction_date;
    if (!effectiveDate) continue;
    const amt = Number(tx.amount) || 0;
    bizExpenseByDate.set(effectiveDate, (bizExpenseByDate.get(effectiveDate) || 0) + amt);
  }

  // Mapeamento diário de Faturamento em Regime de Caixa unificado (RN-02 / INC-02):
  // 1) Vendas à vista + 2) Amortizações de fiado + 3) Mensalidades pagas do Clube + 4) Receitas manuais do negócio
  const salesByDate = new Map<string, { revenue: number; salesCount: number }>();

  // 1) Vendas (contagem de atendimentos + receita das vendas à vista)
  for (const s of sales) {
    if (!s.sale_date) continue;
    const dateStr = getZonedYMD(s.sale_date);
    const amount = Number(s.total_amount) || 0;

    const curDay = salesByDate.get(dateStr) || { revenue: 0, salesCount: 0 };
    curDay.salesCount += 1;

    if (s.payment_method !== 'on_credit') {
      curDay.revenue += amount;
    }
    salesByDate.set(dateStr, curDay);
  }

  // 2) Amortizações de vendas a prazo (inclusive de vendas feitas em meses/anos anteriores)
  for (const a of amortizationsData || []) {
    if (!a.amortized_at) continue;
    const amortDateStr = getZonedYMD(a.amortized_at);
    const dayRecord = salesByDate.get(amortDateStr) || { revenue: 0, salesCount: 0 };
    dayRecord.revenue += Number(a.amount) || 0;
    salesByDate.set(amortDateStr, dayRecord);
  }

  // 3) Mensalidades pagas do Clube de Assinaturas
  for (const inv of (paidInvoicesData as RawPaidInvoiceRow[] | null) || []) {
    const paidDateStr = inv.paid_at ? inv.paid_at.slice(0, 10) : inv.due_date;
    if (!paidDateStr) continue;
    const dayRecord = salesByDate.get(paidDateStr) || { revenue: 0, salesCount: 0 };
    dayRecord.revenue += Number(inv.amount) || 0;
    salesByDate.set(paidDateStr, dayRecord);
  }

  // 4) Receitas manuais do negócio lançadas diretamente no extrato (sem vínculo duplicado)
  for (const tx of businessIncomes) {
    if (!tx.is_paid) continue;
    if (linkedTxIds.has(tx.id)) continue;
    const descLower = (tx.description || '').trim().toLowerCase();
    if (
      descLower.startsWith('atendimento:') ||
      descLower.startsWith('entrada atendimento:') ||
      descLower.startsWith('amortização:') ||
      descLower.startsWith('mensalidade:')
    ) {
      continue;
    }
    const effectiveDate = tx.paid_at ? getZonedYMD(tx.paid_at) : tx.due_date || tx.transaction_date;
    if (!effectiveDate) continue;
    const dayRecord = salesByDate.get(effectiveDate) || { revenue: 0, salesCount: 0 };
    dayRecord.revenue += Number(tx.amount) || 0;
    salesByDate.set(effectiveDate, dayRecord);
  }

  // Ranking de Catálogo (Produtos e Serviços) respeitando o mês selecionado e comparando Janeiro com Dezembro do ano anterior (INC-09)
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? year - 1 : year;

  const productAgg = new Map<string, {
    selectedMonthQuantity: number;
    selectedMonthRevenue: number;
    yearlyQuantity: number;
    yearlyRevenue: number;
    currentMonthCount: number;
    prevMonthCount: number;
  }>();

  for (const s of allSales) {
    if (!s.sale_date) continue;
    const parts = getZonedParts(new Date(s.sale_date));
    const sMonth = parts.month;
    const sYear = parts.year;

    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        // Peças internas inclusas no serviço não contam como venda avulsa no ranking comercial
        if (item.is_service_component) continue;
        const pName = item.product_name;
        const qty = Number(item.quantity) || 1;
        const price = Number(item.total_price) || 0;

        const current = productAgg.get(pName) || {
          selectedMonthQuantity: 0,
          selectedMonthRevenue: 0,
          yearlyQuantity: 0,
          yearlyRevenue: 0,
          currentMonthCount: 0,
          prevMonthCount: 0,
        };

        if (sYear === year) {
          current.yearlyQuantity += qty;
          current.yearlyRevenue += price;
        }

        if (sYear === year && sMonth === currentMonth) {
          current.selectedMonthQuantity += qty;
          current.selectedMonthRevenue += price;
          current.currentMonthCount += qty;
        } else if (sYear === prevMonthYear && sMonth === prevMonthIndex) {
          current.prevMonthCount += qty;
        }

        productAgg.set(pName, current);
      }
    }
  }

  // 1. STATS ANUAIS (12 Meses)
  const yearlyStats: BusinessPeriodStat[] = MONTH_LABELS.map((label, idx) => {
    const mNum = String(idx + 1).padStart(2, '0');
    const lastDayNum = new Date(year, idx + 1, 0).getDate();

    let revenue = 0;
    let expenses = 0;
    let salesCount = 0;

    for (let day = 1; day <= lastDayNum; day++) {
      const dStr = `${year}-${mNum}-${String(day).padStart(2, '0')}`;
      const dayData = salesByDate.get(dStr);
      if (dayData) {
        revenue += dayData.revenue;
        salesCount += dayData.salesCount;
      }
      expenses += bizExpenseByDate.get(dStr) || 0;
    }

    return {
      label,
      fullLabel: `${MONTH_FULL_NAMES[idx]} de ${year}`,
      month: idx,
      monthLabel: label,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      salesCount,
    };
  });

  // 2. STATS MENSAIS (Semanas de Domingo a Sábado do Mês Selecionado)
  const monthlyStats: BusinessPeriodStat[] = calendarWeeks.map((cw) => {
    let revenue = 0;
    let expenses = 0;
    let salesCount = 0;

    for (const day of cw.days) {
      const dayData = salesByDate.get(day.dateStr);
      if (dayData) {
        revenue += dayData.revenue;
        salesCount += dayData.salesCount;
      }
      expenses += bizExpenseByDate.get(day.dateStr) || 0;
    }

    return {
      label: cw.shortLabel,
      fullLabel: cw.label,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      salesCount,
    };
  });

  // 3. STATS SEMANAIS (Dias da Semana Dom a Sáb)
  const weeklyStatsByWeek: Record<number, BusinessPeriodStat[]> = {};

  for (const cw of calendarWeeks) {
    const stats: BusinessPeriodStat[] = cw.days.map((day) => {
      const dayData = salesByDate.get(day.dateStr);
      const rev = dayData?.revenue || 0;
      const exp = bizExpenseByDate.get(day.dateStr) || 0;
      return {
        label: day.weekdayLabel,
        fullLabel: day.fullLabel,
        dateKey: day.dateStr,
        revenue: rev,
        expenses: exp,
        netProfit: rev - exp,
        salesCount: dayData?.salesCount || 0,
      };
    });

    weeklyStatsByWeek[cw.index] = stats;
  }

  // 4. RESUMO DO MÊS SELECIONADO (Faturamento em Caixa, Custos, Lucro Líquido, Margem %, Ticket Médio em Competência e Break-Even)
  const selectedMonthStart = `${year}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const selectedMonthLastDay = new Date(year, currentMonth + 1, 0).getDate();
  const selectedMonthEnd = `${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedMonthLastDay).padStart(2, '0')}`;

  const currentMonthStat = yearlyStats[currentMonth] || { revenue: 0, salesCount: 0 };
  const monthRevenue = currentMonthStat.revenue;
  const monthSalesCount = currentMonthStat.salesCount;

  // Vendas realizadas no mês selecionado (base de competência para Ticket Médio, Ranking e Custos de Peças)
  const selectedMonthSales = sales.filter((s) => {
    if (!s.sale_date) return false;
    const parts = getZonedParts(new Date(s.sale_date));
    return parts.month === currentMonth && parts.year === year;
  });

  const grossSalesRevenue = selectedMonthSales.reduce(
    (acc, s) => acc + (Number(s.total_amount) || 0),
    0
  );

  // Custo de Produtos e Peças utilizadas nas vendas do mês (RN-10 / INC-16)
  let partsAndProductsCost = 0;
  for (const s of selectedMonthSales) {
    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        const qty = Number(item.quantity) || 1;
        const unitCost =
          Number(item.unit_cost) > 0
            ? Number(item.unit_cost)
            : Number(item.product?.cost_price) || 0;
        partsAndProductsCost += qty * unitCost;
      }
    }
  }
  partsAndProductsCost = Math.round(partsAndProductsCost * 100) / 100;

  // Gastos do Negócio pertencentes ao mês (competência de vencimento) ou pagos no mês
  const monthBizExpenses = businessExpenses.filter((t) => {
    const effectivePaidDate = t.is_paid && t.paid_at ? getZonedYMD(t.paid_at) : t.due_date;
    return (
      (t.due_date >= selectedMonthStart && t.due_date <= selectedMonthEnd) ||
      (t.is_paid && effectivePaidDate >= selectedMonthStart && effectivePaidDate <= selectedMonthEnd)
    );
  });

  let paidExpenses = 0;
  let pendingExpenses = 0;
  const sourceMap = new Map<string, BusinessExpenseSourceStat>();

  for (const tx of monthBizExpenses) {
    const amt = Number(tx.amount) || 0;
    const effectivePaidDate = tx.is_paid && tx.paid_at ? getZonedYMD(tx.paid_at) : tx.due_date;
    const isPaidInSelectedMonth =
      tx.is_paid && effectivePaidDate >= selectedMonthStart && effectivePaidDate <= selectedMonthEnd;
    const isDueInSelectedMonth =
      tx.due_date >= selectedMonthStart && tx.due_date <= selectedMonthEnd;

    if (isPaidInSelectedMonth) {
      paidExpenses += amt;
    } else if (!tx.is_paid && isDueInSelectedMonth) {
      pendingExpenses += amt;
    } else {
      continue;
    }

    const isCard = Boolean(tx.credit_card_id);
    const sourceId = (isCard ? tx.credit_card_id : tx.account_id) || 'other';
    const sourceName = isCard
      ? tx.credit_card?.name || 'Cartão de Crédito'
      : tx.account?.name || 'Conta / Caixa';
    const sourceColor = isCard
      ? tx.credit_card?.color || '#8b5cf6'
      : tx.account?.color || '#3b82f6';

    const curSource = sourceMap.get(sourceId) || {
      id: sourceId,
      name: sourceName,
      type: isCard ? 'card' : 'account',
      color: sourceColor,
      paidAmount: 0,
      pendingAmount: 0,
      totalAmount: 0,
    };

    if (isPaidInSelectedMonth) {
      curSource.paidAmount += amt;
    } else {
      curSource.pendingAmount += amt;
    }
    curSource.totalAmount += amt;
    sourceMap.set(sourceId, curSource);
  }

  const totalExpenses = paidExpenses + pendingExpenses;
  const netProfit = monthRevenue - paidExpenses;
  const projectedProfit = monthRevenue - totalExpenses;
  const profitMargin =
    monthRevenue > 0 ? Math.round((netProfit / monthRevenue) * 100) : 0;

  // Ticket Médio calculado em Regime de Competência sobre o valor vendido por atendimento (RN-03 / INC-05)
  const averageTicket =
    monthSalesCount > 0 ? Math.round((grossSalesRevenue / monthSalesCount) * 100) / 100 : 0;

  // Ponto de Equilíbrio (Break-Even) do Negócio no Mês (RN-10 / INC-16)
  const recurringMonthlyFixed = ((businessRecurrencesData as {
    amount?: number;
    frequency?: string;
    scope?: string;
  }[] | null) || [])
    .filter((r) => r.scope === 'business')
    .reduce((acc, r) => {
      const amt = Number(r.amount) || 0;
      return acc + (r.frequency === 'yearly' ? amt / 12 : amt);
    }, 0);

  const fixedAndOperationalExpenses = Math.round(Math.max(totalExpenses, recurringMonthlyFixed) * 100) / 100;
  const totalBreakEvenTarget = Math.round((fixedAndOperationalExpenses + partsAndProductsCost) * 100) / 100;
  const remainingToBreakEven = Math.round(Math.max(0, totalBreakEvenTarget - monthRevenue) * 100) / 100;
  const surplusAfterBreakEven = Math.round(Math.max(0, monthRevenue - totalBreakEvenTarget) * 100) / 100;
  const progressPercent =
    totalBreakEvenTarget > 0
      ? Math.min(100, Math.round((monthRevenue / totalBreakEvenTarget) * 100))
      : 100;

  const salesNeeded =
    averageTicket > 0 && remainingToBreakEven > 0
      ? Math.ceil(remainingToBreakEven / averageTicket)
      : 0;

  const breakEven: BusinessBreakEvenSummary = {
    fixedAndOperationalExpenses,
    partsAndProductsCost,
    totalBreakEvenTarget,
    totalExpenses: totalBreakEvenTarget,
    currentRevenue: monthRevenue,
    revenue: monthRevenue,
    remainingToBreakEven,
    remainingAmount: remainingToBreakEven,
    surplusAfterBreakEven,
    surplusAmount: surplusAfterBreakEven,
    salesNeeded,
    progressPercent,
    isReached: monthRevenue >= totalBreakEvenTarget,
  };

  // Alertas de Produtos com Estoque Baixo (RN-10 / INC-16)
  const lowStockProducts: LowStockProductAlert[] = ((productsCatalogData as {
    id: string;
    name: string;
    cost_price?: number;
    stock_quantity?: number;
    min_stock?: number;
  }[] | null) || [])
    .filter((p) => (Number(p.stock_quantity) || 0) <= (Number(p.min_stock ?? 2)))
    .map((p) => ({
      id: p.id,
      name: p.name,
      stockQuantity: Number(p.stock_quantity) || 0,
      minStock: Number(p.min_stock ?? 2),
      stock_quantity: Number(p.stock_quantity) || 0,
      min_stock: Number(p.min_stock ?? 2),
      costPrice: Number(p.cost_price) || 0,
    }))
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  // Clientes únicos atendidos no mês selecionado (chave unificada por client_id + nome normalizado — INC-10)
  const clientNameToIdMap = new Map<string, string>();
  for (const c of clientsData || []) {
    if (c.name) {
      clientNameToIdMap.set(c.name.trim().toLowerCase(), c.id);
    }
  }

  const uniqueClientsSet = new Set<string>();
  for (const s of selectedMonthSales) {
    const normalizedName = (s.client_name || '').trim().toLowerCase();
    const resolvedId = s.client_id || clientNameToIdMap.get(normalizedName);
    const key = resolvedId || normalizedName;
    if (key) {
      uniqueClientsSet.add(key);
    }
  }

  const uniqueClientsCount = uniqueClientsSet.size;
  const clientReturnRate =
    uniqueClientsCount > 0
      ? Math.round((monthSalesCount / uniqueClientsCount) * 10) / 10
      : 0;

  const totalReceivables = (pendingSalesData || []).reduce(
    (acc, curr) => acc + Number(curr.remaining_amount || 0),
    0
  );

  const monthOnCreditRevenue = selectedMonthSales
    .filter((s) => s.payment_method === 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.remaining_amount ?? curr.total_amount ?? 0), 0);

  const monthSummary: BusinessMonthSummary = {
    revenue: monthRevenue,
    grossSalesRevenue,
    paidExpenses,
    pendingExpenses,
    totalExpenses,
    partsAndProductsCost,
    netProfit,
    projectedProfit,
    profitMargin,
    salesCount: monthSalesCount,
    uniqueClientsCount,
    clientReturnRate,
    averageTicket,
    totalReceivables,
    monthOnCreditRevenue,
    breakEven,
  };

  const expensesBySource = Array.from(sourceMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  const recentExpenses: RecentBusinessExpense[] = monthBizExpenses.slice(0, 6).map((tx) => {
    const isCard = Boolean(tx.credit_card_id);
    return {
      id: tx.id,
      description: tx.description,
      category_name: tx.category?.name || 'Insumos & Barbearia',
      category_color: tx.category?.color || '#f59e0b',
      source_name: isCard
        ? tx.credit_card?.name || 'Cartão'
        : tx.account?.name || 'Conta',
      source_type: isCard ? 'card' : 'account',
      amount: Number(tx.amount) || 0,
      due_date: tx.due_date,
      is_paid: tx.is_paid,
    };
  });

  const defaultWeekIndex = findDefaultWeekIndex(calendarWeeks);

  const weeksMeta: WeekMeta[] = calendarWeeks.map((cw) => ({
    index: cw.index,
    label: cw.label,
    shortLabel: cw.shortLabel,
    startDate: cw.startDate,
    endDate: cw.endDate,
  }));

  // Top 5 Produtos/Serviços do mês selecionado (ou do ano caso o mês ainda não tenha vendas — INC-09)
  const hasMonthProductSales = Array.from(productAgg.values()).some(
    (s) => s.selectedMonthQuantity > 0
  );

  const topProducts: TopProductStat[] = Array.from(productAgg.entries())
    .filter(([, stat]) => (hasMonthProductSales ? stat.selectedMonthQuantity > 0 : stat.yearlyQuantity > 0))
    .map(([name, stat]) => {
      let growth = 0;
      if (stat.prevMonthCount > 0) {
        growth = Math.round(((stat.currentMonthCount - stat.prevMonthCount) / stat.prevMonthCount) * 100);
      } else if (stat.currentMonthCount > 0) {
        growth = 100;
      }
      return {
        name,
        salesCount: hasMonthProductSales ? stat.selectedMonthQuantity : stat.yearlyQuantity,
        revenue: hasMonthProductSales ? stat.selectedMonthRevenue : stat.yearlyRevenue,
        growth,
      };
    })
    .sort((a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue)
    .slice(0, 5);

  // Últimas 5 vendas
  const recentSales: RecentBusinessSale[] = sales.slice(0, 5).map((s) => ({
    id: s.id,
    client_name: s.client_name,
    account_name: (s.account as unknown as { name?: string })?.name || 'Conta Padrão',
    total_amount: Number(s.total_amount) || 0,
    sale_date: s.sale_date,
  }));

  // 5. TOP 5 CLIENTES DO MÊS SELECIONADO (Excluindo 'Cliente Avulso' e agrupando por client_id + nome normalizado — INC-10)
  const clientAggMap = new Map<string, {
    name: string;
    visitsCount: number;
    totalSpent: number;
    lastVisitDate: string;
  }>();

  // 6. DIVISÃO DE FATURAMENTO EM COMPETÊNCIA: SERVIÇOS VS PRODUTOS
  let serviceRevenue = 0;
  let productRevenue = 0;
  let serviceCount = 0;
  let productCount = 0;

  type SaleItemWithProduct = {
    product_name: string;
    quantity: number;
    total_price: number;
    is_service_component?: boolean;
    product?: { type?: string } | null;
  };

  for (const s of selectedMonthSales) {
    const rawName = (s.client_name || '').trim();
    const lowerName = rawName.toLowerCase();
    const isWalkIn =
      !s.client_id &&
      (!rawName || lowerName === 'cliente avulso' || lowerName === 'avulso' || lowerName === 'sem cliente');

    if (!isWalkIn) {
      const resolvedId = s.client_id || clientNameToIdMap.get(lowerName);
      const clientKey = resolvedId || lowerName;
      const curClient = clientAggMap.get(clientKey) || {
        name: rawName || 'Cliente',
        visitsCount: 0,
        totalSpent: 0,
        lastVisitDate: s.sale_date,
      };
      curClient.visitsCount += 1;
      curClient.totalSpent += Number(s.total_amount) || 0;
      if (s.sale_date > curClient.lastVisitDate) {
        curClient.lastVisitDate = s.sale_date;
      }
      clientAggMap.set(clientKey, curClient);
    }

    const items = (s.items as unknown as SaleItemWithProduct[]) || [];
    if (items.length > 0) {
      for (const item of items) {
        if (item.is_service_component) continue;
        const itemTotal = Number(item.total_price) || 0;
        const itemQty = Number(item.quantity) || 1;
        const isProduct = item.product?.type === 'product';

        if (isProduct) {
          productRevenue += itemTotal;
          productCount += itemQty;
        } else {
          serviceRevenue += itemTotal;
          serviceCount += itemQty;
        }
      }
    } else {
      serviceRevenue += Number(s.total_amount) || 0;
      serviceCount += 1;
    }
  }

  const topClients: TopMonthClient[] = Array.from(clientAggMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent || b.visitsCount - a.visitsCount)
    .slice(0, 5);

  const revenueSplit = computeRevenueSplit(
    serviceRevenue,
    productRevenue,
    serviceCount,
    productCount
  );

  // 7. CLIENTES PARA RETORNO UNIFICADO COM O RADAR PONDERADO (RN-08 / INC-11)
  const defaultCycleDays = Number(profileData?.default_cycle_days) || 25;
  const inactiveCandidates: InactiveClientAlert[] = [];
  const todayStr = getTodayYMD();

  for (const c of clientsData || []) {
    const cSales = (c.sales as unknown as { id?: string; sale_date: string; total_amount: number }[]) || [];
    if (cSales.length < 2) continue;

    const lastContactedAt = (c as { last_contacted_at?: string | null }).last_contacted_at;
    const isRecentlyContacted = Boolean(
      lastContactedAt && diffDaysYMD(saleDateToYMD(lastContactedAt), todayStr) <= 7
    );

    const analytics = analyzeClientSales(
      cSales.map((s, idx) => ({
        id: s.id || String(idx),
        sale_date: s.sale_date,
        total_amount: Number(s.total_amount || 0),
      })),
      new Date(),
      defaultCycleDays
    );

    const sortedDates = cSales.map((s) => s.sale_date).sort();
    const lastVisitDateStr = sortedDates[sortedDates.length - 1] || todayStr;

    if (
      !isRecentlyContacted &&
      (analytics.status === 'overdue' || analytics.status === 'missing') &&
      analytics.daysSinceLastVisit !== null
    ) {
      inactiveCandidates.push({
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        daysSinceLastVisit: analytics.daysSinceLastVisit,
        lastVisitDate: lastVisitDateStr,
        totalVisitsAllTime: cSales.length,
      });
    }
  }

  const inactiveClientsAlerts = inactiveCandidates
    .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit || b.totalVisitsAllTime - a.totalVisitsAllTime)
    .slice(0, 5);

  return {
    yearlyStats,
    monthlyStats,
    weeklyStatsByWeek,
    weeksMeta,
    defaultWeekIndex,
    topProducts,
    topClients,
    revenueSplit,
    inactiveClientsAlerts,
    lowStockProducts,
    breakEven,
    recentSales,
    recentExpenses,
    expensesBySource,
    monthSummary,
    clubOverview,
  };
}

export async function getGeneralDashboardData(
  year: number,
  month: number = getZonedParts().month
): Promise<GeneralDashboardData> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Semanas (Domingo a Sábado) que intersectam o mês selecionado
  const calendarWeeks = buildCalendarWeeks(year, month);

  // Define os limites abrangentes para a query
  const earliestDate = calendarWeeks.length > 0 && calendarWeeks[0].startDate < startDate
    ? calendarWeeks[0].startDate
    : startDate;
  const latestDate = calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].endDate > endDate
    ? calendarWeeks[calendarWeeks.length - 1].endDate
    : endDate;

  const queryStartDate = earliestDate;
  const queryEndDate = latestDate;
  const { startIso: salesQueryStart, endIso: salesQueryEnd } =
    getZonedRangeBoundsIso(queryStartDate, queryEndDate);

  type GeneralTxRow = {
    id: string;
    amount: number;
    type: string;
    is_paid: boolean;
    paid_at?: string | null;
    due_date: string;
    transaction_date?: string;
    account_id?: string | null;
    description: string;
    notes: string | null;
    scope?: string;
    category?: { id: string; name: string; color: string } | null;
  };

  const [
    { data: txData, error: txError },
    { data: salesData, error: salesError },
    { data: amortizationsData },
    { data: paidInvoicesData },
    { data: priorBalanceData, error: priorBalanceError },
  ] = await Promise.all([
    fetchAllPages<GeneralTxRow>((from, to) =>
      supabase
        .from('transactions')
        .select('id, amount, type, is_paid, paid_at, due_date, transaction_date, account_id, description, notes, scope, category:categories(id, name, color)')
        .eq('user_id', user.id)
        .gte('due_date', queryStartDate)
        .lte('due_date', queryEndDate)
        .range(from, to) as unknown as PromiseLike<{ data: GeneralTxRow[] | null; error: { message: string } | null }>
    ),
    fetchAllPages<{ total_amount: number; sale_date: string; payment_method: string }>((from, to) =>
      supabase
        .from('sales')
        .select('total_amount, sale_date, payment_method')
        .eq('user_id', user.id)
        .gte('sale_date', salesQueryStart)
        .lte('sale_date', salesQueryEnd)
        .range(from, to) as unknown as PromiseLike<{ data: { total_amount: number; sale_date: string; payment_method: string }[] | null; error: { message: string } | null }>
    ),
    fetchAllPages<{ amount: number; amortized_at: string }>((from, to) =>
      supabase
        .from('sale_amortizations')
        .select('amount, amortized_at')
        .eq('user_id', user.id)
        .gte('amortized_at', salesQueryStart)
        .lte('amortized_at', salesQueryEnd)
        .range(from, to) as unknown as PromiseLike<{ data: { amount: number; amortized_at: string }[] | null; error: { message: string } | null }>
    ),
    supabase
      .from('subscription_invoices')
      .select('amount, paid_at, due_date')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('due_date', queryStartDate)
      .lte('due_date', queryEndDate),
    // Saldo acumulado anterior ao período, calculado no banco
    supabase.rpc('get_account_prior_balance', { p_before: queryStartDate }),
  ]);

  if (txError) console.error('Erro ao buscar transações:', txError);
  if (salesError) console.error('Erro ao buscar vendas:', salesError);

  // Mapeamento de receita do negócio em Regime de Caixa unificado (RN-02 / INC-02)
  const salesByDate = new Map<string, number>();
  if (salesData) {
    for (const s of salesData) {
      if (!s.sale_date || s.payment_method === 'on_credit') continue;
      const dStr = getZonedYMD(s.sale_date);
      salesByDate.set(dStr, (salesByDate.get(dStr) || 0) + (Number(s.total_amount) || 0));
    }
  }
  for (const a of amortizationsData || []) {
    if (!a.amortized_at) continue;
    const dStr = getZonedYMD(a.amortized_at);
    salesByDate.set(dStr, (salesByDate.get(dStr) || 0) + (Number(a.amount) || 0));
  }
  for (const inv of paidInvoicesData || []) {
    const dStr = inv.paid_at ? inv.paid_at.slice(0, 10) : inv.due_date;
    if (!dStr) continue;
    salesByDate.set(dStr, (salesByDate.get(dStr) || 0) + (Number(inv.amount) || 0));
  }

  // Fluxo de caixa realizado usa a data efetiva do pagamento (RN-07 / INC-12)
  const txByDate = new Map<string, { income: number; expense: number }>();
  const accountDeltasByDate = new Map<string, number>();
  const operationalTxs: GeneralTxRow[] = [];

  if (txData) {
    for (const t of txData) {
      const isBalanceAdjustment = (t.notes || '').includes('[Ajuste de Saldo]');
      if (!isBalanceAdjustment) {
        operationalTxs.push(t);
      }

      if (!t.is_paid) continue;
      const effectiveDate = t.paid_at
        ? getZonedYMD(t.paid_at)
        : t.due_date || t.transaction_date || '';
      if (!effectiveDate) continue;

      const amt = Number(t.amount) || 0;

      // Movimentação de saldo bancário inclui ajustes de saldo na data em que ocorreram
      if (t.account_id) {
        const signedAmt = t.type === 'income' ? amt : -amt;
        accountDeltasByDate.set(
          effectiveDate,
          (accountDeltasByDate.get(effectiveDate) || 0) + signedAmt
        );
      }

      // Totais de receitas e despesas operacionais ignoram ajustes internos de saldo
      if (!isBalanceAdjustment) {
        const cur = txByDate.get(effectiveDate) || { income: 0, expense: 0 };
        if (t.type === 'income') cur.income += amt;
        else if (t.type === 'expense') cur.expense += amt;
        txByDate.set(effectiveDate, cur);
      }
    }
  }

  let basePriorBalance = 0;

  if (!priorBalanceError && priorBalanceData !== null && priorBalanceData !== undefined) {
    basePriorBalance = Number(priorBalanceData) || 0;
  } else {
    if (priorBalanceError) {
      console.warn(
        'RPC get_account_prior_balance indisponível, usando cálculo local:',
        priorBalanceError.message
      );
    }

    const [{ data: accountsData }, { data: priorTxData }] = await Promise.all([
      supabase.from('accounts').select('id, initial_balance').eq('user_id', user.id),
      supabase
        .from('transactions')
        .select('amount, type, paid_at, due_date, transaction_date')
        .eq('user_id', user.id)
        .eq('is_paid', true)
        .not('account_id', 'is', null)
        .lt('due_date', queryStartDate),
    ]);

    basePriorBalance = (accountsData || []).reduce(
      (acc, a) => acc + (Number(a.initial_balance) || 0),
      0
    );
    for (const t of priorTxData || []) {
      const effectiveDate = t.paid_at
        ? getZonedYMD(t.paid_at)
        : t.due_date || t.transaction_date || '';
      if (effectiveDate && effectiveDate >= queryStartDate) continue;
      const amt = Number(t.amount) || 0;
      basePriorBalance += t.type === 'income' ? amt : -amt;
    }
  }

  const sortedDeltaDates = Array.from(accountDeltasByDate.keys()).sort();
  const cumulativeBalanceAtDate = (targetDateStr: string): number => {
    let bal = basePriorBalance;
    for (const d of sortedDeltaDates) {
      if (d <= targetDateStr) {
        bal += accountDeltasByDate.get(d) || 0;
      } else {
        break;
      }
    }
    return bal;
  };

  // 1. STATS ANUAIS (12 Meses)
  const yearlyStats: PeriodStat[] = MONTH_LABELS.map((label, idx) => {
    const mNum = String(idx + 1).padStart(2, '0');
    const lastDayNum = new Date(year, idx + 1, 0).getDate();
    const mEnd = `${year}-${mNum}-${String(lastDayNum).padStart(2, '0')}`;

    let serviceRevenue = 0;
    let generalIncome = 0;
    let generalExpense = 0;

    for (let day = 1; day <= lastDayNum; day++) {
      const dStr = `${year}-${mNum}-${String(day).padStart(2, '0')}`;
      serviceRevenue += salesByDate.get(dStr) || 0;
      const tx = txByDate.get(dStr);
      if (tx) {
        generalIncome += tx.income;
        generalExpense += tx.expense;
      }
    }

    return {
      label,
      fullLabel: `${MONTH_FULL_NAMES[idx]} de ${year}`,
      month: idx,
      monthLabel: label,
      serviceRevenue,
      generalIncome,
      generalExpense,
      netBalance: generalIncome - generalExpense,
      accountBalance: cumulativeBalanceAtDate(mEnd),
    };
  });

  // 2. STATS MENSAIS (Semanas de Domingo a Sábado do Mês Selecionado)
  const monthlyStats: PeriodStat[] = calendarWeeks.map((cw) => {
    let serviceRevenue = 0;
    let generalIncome = 0;
    let generalExpense = 0;

    for (const day of cw.days) {
      serviceRevenue += salesByDate.get(day.dateStr) || 0;
      const tx = txByDate.get(day.dateStr);
      if (tx) {
        generalIncome += tx.income;
        generalExpense += tx.expense;
      }
    }

    return {
      label: cw.shortLabel,
      fullLabel: cw.label,
      serviceRevenue,
      generalIncome,
      generalExpense,
      netBalance: generalIncome - generalExpense,
      accountBalance: cumulativeBalanceAtDate(cw.endDate),
    };
  });

  // 3. STATS SEMANAIS (Dias da Semana Dom a Sáb para cada semana do mês)
  const weeklyStatsByWeek: Record<number, PeriodStat[]> = {};

  for (const cw of calendarWeeks) {
    const stats: PeriodStat[] = cw.days.map((day) => {
      const serviceRevenue = salesByDate.get(day.dateStr) || 0;
      const tx = txByDate.get(day.dateStr);
      const generalIncome = tx?.income || 0;
      const generalExpense = tx?.expense || 0;

      return {
        label: day.weekdayLabel,
        fullLabel: day.fullLabel,
        dateKey: day.dateStr,
        serviceRevenue,
        generalIncome,
        generalExpense,
        netBalance: generalIncome - generalExpense,
        accountBalance: cumulativeBalanceAtDate(day.dateStr),
      };
    });

    weeklyStatsByWeek[cw.index] = stats;
  }

  const defaultWeekIndex = findDefaultWeekIndex(calendarWeeks);

  const weeksMeta: WeekMeta[] = calendarWeeks.map((cw) => ({
    index: cw.index,
    label: cw.label,
    shortLabel: cw.shortLabel,
    startDate: cw.startDate,
    endDate: cw.endDate,
  }));

  const { incomeCategories, expenseCategories } = buildYearlyCategoryEvolution(
    (operationalTxs as unknown as RawEvolutionTransaction[]) || [],
    year
  );

  return {
    yearlyStats,
    monthlyStats,
    weeklyStatsByWeek,
    weeksMeta,
    defaultWeekIndex,
    incomeCategoryEvolution: incomeCategories,
    expenseCategoryEvolution: expenseCategories,
  };
}

export async function getYearlyCategoryEvolution(year: number): Promise<{
  incomeCategories: CategoryMonthlyEvolutionItem[];
  expenseCategories: CategoryMonthlyEvolutionItem[];
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: txData, error } = await fetchAllPages<RawEvolutionTransaction>((from, to) =>
    supabase
      .from('transactions')
      .select(
        'id, amount, type, is_paid, due_date, description, notes, category:categories(id, name, color)'
      )
      .eq('user_id', user.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .range(from, to) as unknown as PromiseLike<{ data: RawEvolutionTransaction[] | null; error: { message: string } | null }>
  );

  if (error) {
    console.error('Erro ao buscar evolução por categorias:', error);
    return { incomeCategories: [], expenseCategories: [] };
  }

  const filtered = (txData || []).filter(
    (t) => !((t as { notes?: string | null }).notes || '').includes('[Ajuste de Saldo]')
  );

  return buildYearlyCategoryEvolution(filtered, year);
}


