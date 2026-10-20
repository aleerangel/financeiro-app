'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { buildCalendarWeeks, findDefaultWeekIndex } from '@/lib/week-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import {
  getZonedParts,
  getZonedRangeBoundsIso,
  getZonedYMD,
} from '@/lib/date-utils';
import {
  buildYearlyCategoryEvolution,
  CategoryMonthlyEvolutionItem,
  RawEvolutionTransaction,
} from '@/lib/category-evolution-utils';
import { Transaction } from '@/types/database';

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

export interface BusinessMonthSummary {
  revenue: number;
  paidExpenses: number;
  pendingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  projectedProfit: number;
  profitMargin: number;
  salesCount: number;
  averageTicket: number;
}

export interface BusinessDashboardData {
  yearlyStats: BusinessPeriodStat[];
  monthlyStats: BusinessPeriodStat[];
  weeklyStatsByWeek: Record<number, BusinessPeriodStat[]>;
  weeksMeta: WeekMeta[];
  defaultWeekIndex: number;
  topProducts: TopProductStat[];
  recentSales: RecentBusinessSale[];
  recentExpenses: RecentBusinessExpense[];
  expensesBySource: BusinessExpenseSourceStat[];
  monthSummary: BusinessMonthSummary;
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

  const earliestDate = calendarWeeks.length > 0 && calendarWeeks[0].startDate < startDate
    ? calendarWeeks[0].startDate
    : startDate;
  const latestDate = calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].endDate > endDate
    ? calendarWeeks[calendarWeeks.length - 1].endDate
    : endDate;

  const { startIso: bizSalesStartIso, endIso: bizSalesEndIso } =
    getZonedRangeBoundsIso(earliestDate, latestDate);

  // 1. Busca vendas e despesas no período abrangente em paralelo
  const [
    { data: salesData, error: salesError },
    { data: txData, error: txError },
  ] = await Promise.all([
    supabase
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
      .gte('sale_date', bizSalesStartIso)
      .lte('sale_date', bizSalesEndIso)
      .order('sale_date', { ascending: false }),
    supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name, color),
        credit_card:credit_cards(id, name, color)
      `)
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('due_date', earliestDate)
      .lte('due_date', latestDate)
      .order('due_date', { ascending: false }),
  ]);

  if (salesError || !salesData) {
    console.error('Erro ao buscar dados de vendas do dashboard:', salesError);
  }
  if (txError) {
    console.error('Erro ao buscar despesas do dashboard:', txError);
  }

  const sales = salesData || [];
  const allExpenses = (txData as unknown as Transaction[]) || [];
  const businessExpenses = allExpenses.filter((t) => isBusinessTransaction(t));

  // Mapeamento diário de despesas pagas da Barbearia para os gráficos
  const bizExpenseByDate = new Map<string, number>();
  for (const tx of businessExpenses) {
    if (!tx.due_date || !tx.is_paid) continue;
    const amt = Number(tx.amount) || 0;
    bizExpenseByDate.set(tx.due_date, (bizExpenseByDate.get(tx.due_date) || 0) + amt);
  }

  // Mapeamento diário de vendas
  const salesByDate = new Map<string, { revenue: number; salesCount: number }>();
  const productAgg = new Map<string, {
    totalQuantity: number;
    totalRevenue: number;
    currentMonthCount: number;
    prevMonthCount: number;
  }>();

  for (const s of sales) {
    if (!s.sale_date) continue;
    const dateStr = getZonedYMD(s.sale_date);
    const m = getZonedParts(new Date(s.sale_date)).month;
    const amount = Number(s.total_amount) || 0;

    const curDay = salesByDate.get(dateStr) || { revenue: 0, salesCount: 0 };
    curDay.revenue += amount;
    curDay.salesCount += 1;
    salesByDate.set(dateStr, curDay);

    // Processa itens para ranking de produtos
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

  // 4. RESUMO DO MÊS SELECIONADO (Faturamento, Gastos da Barbearia, Lucro Líquido e Margem %)
  const selectedMonthStart = `${year}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const selectedMonthLastDay = new Date(year, currentMonth + 1, 0).getDate();
  const selectedMonthEnd = `${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedMonthLastDay).padStart(2, '0')}`;

  const currentMonthStat = yearlyStats[currentMonth] || { revenue: 0, salesCount: 0 };
  const monthRevenue = currentMonthStat.revenue;
  const monthSalesCount = currentMonthStat.salesCount;

  const monthBizExpenses = businessExpenses.filter(
    (t) => t.due_date >= selectedMonthStart && t.due_date <= selectedMonthEnd
  );

  let paidExpenses = 0;
  let pendingExpenses = 0;
  const sourceMap = new Map<string, BusinessExpenseSourceStat>();

  for (const tx of monthBizExpenses) {
    const amt = Number(tx.amount) || 0;
    if (tx.is_paid) {
      paidExpenses += amt;
    } else {
      pendingExpenses += amt;
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

    if (tx.is_paid) {
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
  const averageTicket =
    monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0;

  const monthSummary: BusinessMonthSummary = {
    revenue: monthRevenue,
    paidExpenses,
    pendingExpenses,
    totalExpenses,
    netProfit,
    projectedProfit,
    profitMargin,
    salesCount: monthSalesCount,
    averageTicket,
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

  // Top 5 Produtos/Serviços
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

  // Últimas 5 vendas
  const recentSales: RecentBusinessSale[] = sales.slice(0, 5).map((s) => ({
    id: s.id,
    client_name: s.client_name,
    account_name: (s.account as unknown as { name?: string })?.name || 'Conta Padrão',
    total_amount: Number(s.total_amount) || 0,
    sale_date: s.sale_date,
  }));

  return {
    yearlyStats,
    monthlyStats,
    weeklyStatsByWeek,
    weeksMeta,
    defaultWeekIndex,
    topProducts,
    recentSales,
    recentExpenses,
    expensesBySource,
    monthSummary,
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

  const [
    { data: txData, error: txError },
    { data: salesData, error: salesError },
    { data: priorBalanceData, error: priorBalanceError },
    { data: accountTxData, error: accountTxError },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, amount, type, is_paid, due_date, description, notes, category:categories(id, name, color)')
      .eq('user_id', user.id)
      .gte('due_date', queryStartDate)
      .lte('due_date', queryEndDate),
    supabase
      .from('sales')
      .select('total_amount, sale_date')
      .eq('user_id', user.id)
      .gte('sale_date', salesQueryStart)
      .lte('sale_date', salesQueryEnd),
    // Saldo acumulado anterior ao período, calculado no banco (sem trafegar todo o histórico)
    supabase.rpc('get_account_prior_balance', { p_before: queryStartDate }),
    // Apenas movimentações pagas dentro do período exibido
    supabase
      .from('transactions')
      .select('amount, type, due_date')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .not('account_id', 'is', null)
      .gte('due_date', queryStartDate)
      .lte('due_date', queryEndDate),
  ]);

  if (txError) console.error('Erro ao buscar transações:', txError);
  if (salesError) console.error('Erro ao buscar vendas:', salesError);
  if (accountTxError) console.error('Erro ao buscar transações de contas:', accountTxError);

  // Mapeamento por data YYYY-MM-DD (no fuso de São Paulo)
  const salesByDate = new Map<string, number>();
  if (salesData) {
    for (const s of salesData) {
      if (!s.sale_date) continue;
      const dStr = getZonedYMD(s.sale_date);
      salesByDate.set(dStr, (salesByDate.get(dStr) || 0) + (Number(s.total_amount) || 0));
    }
  }

  const txByDate = new Map<string, { income: number; expense: number }>();
  if (txData) {
    for (const t of txData) {
      if (!t.due_date || !t.is_paid) continue;
      const cur = txByDate.get(t.due_date) || { income: 0, expense: 0 };
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') cur.income += amt;
      else if (t.type === 'expense') cur.expense += amt;
      txByDate.set(t.due_date, cur);
    }
  }

  let basePriorBalance = 0;

  if (!priorBalanceError && priorBalanceData !== null && priorBalanceData !== undefined) {
    basePriorBalance = Number(priorBalanceData) || 0;
  } else {
    // Compatibilidade: migration ainda não aplicada -> calcula o saldo anterior no servidor
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
        .select('amount, type')
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
      const amt = Number(t.amount) || 0;
      basePriorBalance += t.type === 'income' ? amt : -amt;
    }
  }

  const accountDeltasByDate = new Map<string, number>();

  if (accountTxData) {
    for (const t of accountTxData) {
      if (!t.due_date) continue;
      const amt = Number(t.amount) || 0;
      const signedAmt = t.type === 'income' ? amt : -amt;
      accountDeltasByDate.set(t.due_date, (accountDeltasByDate.get(t.due_date) || 0) + signedAmt);
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
  const MONTH_FULL_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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
    (txData as unknown as RawEvolutionTransaction[]) || [],
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

  const { data: txData, error } = await supabase
    .from('transactions')
    .select(
      'id, amount, type, is_paid, due_date, description, notes, category:categories(id, name, color)'
    )
    .eq('user_id', user.id)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (error) {
    console.error('Erro ao buscar evolução por categorias:', error);
    return { incomeCategories: [], expenseCategories: [] };
  }

  return buildYearlyCategoryEvolution(
    (txData as unknown as RawEvolutionTransaction[]) || [],
    year
  );
}


