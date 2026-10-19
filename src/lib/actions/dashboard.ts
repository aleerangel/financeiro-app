'use server';

import { createClient } from '@/lib/supabase/server';

export interface BusinessPeriodStat {
  label: string; // Ex: 'Jan', '01-07', 'Seg'
  fullLabel: string; // Ex: 'Janeiro de 2026', '01 a 07 de Outubro', 'Segunda-feira (12/10)'
  dateKey?: string;
  month?: number;
  monthLabel?: string;
  salesCount: number;
  revenue: number;
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

export interface BusinessDashboardData {
  yearlyStats: BusinessPeriodStat[];
  monthlyStats: BusinessPeriodStat[];
  weeklyStatsByWeek: Record<number, BusinessPeriodStat[]>;
  weeksMeta: WeekMeta[];
  defaultWeekIndex: number;
  topProducts: TopProductStat[];
  recentSales: RecentBusinessSale[];
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
}

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getBusinessDashboardData(year: number, currentMonth: number): Promise<BusinessDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Calcula semanas de Domingo a Sábado do mês atual
  const firstDayOfMonth = new Date(year, currentMonth, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0: Dom, 1: Seg, ..., 6: Sáb
  const diffToSunday = -firstDayOfWeek;
  const initialSunday = new Date(year, currentMonth, 1 + diffToSunday);
  const lastDayOfMonth = new Date(year, currentMonth + 1, 0);

  const calendarWeeks: {
    index: number;
    label: string;
    shortLabel: string;
    startDate: string;
    endDate: string;
    days: {
      dateStr: string;
      weekdayLabel: string;
      fullLabel: string;
    }[];
  }[] = [];

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullWeekdayNames = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  const iterDate = new Date(initialSunday);
  let wIdx = 0;

  while (iterDate <= lastDayOfMonth) {
    const weekStart = new Date(iterDate); // Domingo
    const sundayStr = formatDateYMD(weekStart);
    const days = [];

    // 7 dias: Domingo (0) até Sábado (6)
    for (let d = 0; d < 7; d++) {
      const cur = new Date(weekStart);
      cur.setDate(cur.getDate() + d);
      const dateStr = formatDateYMD(cur);
      const dayNum = String(cur.getDate()).padStart(2, '0');
      const mNum = String(cur.getMonth() + 1).padStart(2, '0');
      const dayOfWeek = cur.getDay();

      days.push({
        dateStr,
        weekdayLabel: weekdayNames[dayOfWeek],
        fullLabel: `${fullWeekdayNames[dayOfWeek]} (${dayNum}/${mNum})`,
      });
    }

    const saturdayDate = new Date(weekStart);
    saturdayDate.setDate(saturdayDate.getDate() + 6);
    const saturdayStr = formatDateYMD(saturdayDate);

    const startDisplay = `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
    const endDisplay = `${String(saturdayDate.getDate()).padStart(2, '0')}/${String(saturdayDate.getMonth() + 1).padStart(2, '0')}`;

    calendarWeeks.push({
      index: wIdx,
      label: `Semana ${wIdx + 1} (${startDisplay} a ${endDisplay})`,
      shortLabel: `${startDisplay} - ${endDisplay}`,
      startDate: sundayStr,
      endDate: saturdayStr,
      days,
    });

    wIdx++;
    iterDate.setDate(iterDate.getDate() + 7);
  }

  const earliestDate = calendarWeeks.length > 0 && calendarWeeks[0].startDate < startDate
    ? calendarWeeks[0].startDate
    : startDate;
  const latestDate = calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].endDate > endDate
    ? calendarWeeks[calendarWeeks.length - 1].endDate
    : endDate;

  // 1. Busca vendas no período abrangente
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
    .gte('sale_date', `${earliestDate}T00:00:00.000Z`)
    .lte('sale_date', `${latestDate}T23:59:59.999Z`)
    .order('sale_date', { ascending: false });

  if (salesError || !salesData) {
    console.error('Erro ao buscar dados de vendas do dashboard:', salesError);
  }

  const sales = salesData || [];

  // Mapeamento diário
  const salesByDate = new Map<string, { revenue: number; salesCount: number }>();
  const productAgg = new Map<string, {
    totalQuantity: number;
    totalRevenue: number;
    currentMonthCount: number;
    prevMonthCount: number;
  }>();

  for (const s of sales) {
    if (!s.sale_date) continue;
    const dateStr = s.sale_date.split('T')[0];
    const saleDate = new Date(s.sale_date);
    const m = saleDate.getMonth();
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
    let salesCount = 0;

    for (let day = 1; day <= lastDayNum; day++) {
      const dStr = `${year}-${mNum}-${String(day).padStart(2, '0')}`;
      const dayData = salesByDate.get(dStr);
      if (dayData) {
        revenue += dayData.revenue;
        salesCount += dayData.salesCount;
      }
    }

    return {
      label,
      fullLabel: `${MONTH_FULL_NAMES[idx]} de ${year}`,
      month: idx,
      monthLabel: label,
      revenue,
      salesCount,
    };
  });

  // 2. STATS MENSAIS (Semanas de Domingo a Sábado do Mês Selecionado)
  const monthlyStats: BusinessPeriodStat[] = calendarWeeks.map((cw, i) => {
    let revenue = 0;
    let salesCount = 0;

    for (const day of cw.days) {
      const dayData = salesByDate.get(day.dateStr);
      if (dayData) {
        revenue += dayData.revenue;
        salesCount += dayData.salesCount;
      }
    }

    return {
      label: cw.shortLabel,
      fullLabel: cw.label,
      revenue,
      salesCount,
    };
  });

  // 3. STATS SEMANAIS (Dias da Semana Dom a Sáb)
  const weeklyStatsByWeek: Record<number, BusinessPeriodStat[]> = {};

  for (const cw of calendarWeeks) {
    const stats: BusinessPeriodStat[] = cw.days.map((day) => {
      const dayData = salesByDate.get(day.dateStr);
      return {
        label: day.weekdayLabel,
        fullLabel: day.fullLabel,
        dateKey: day.dateStr,
        revenue: dayData?.revenue || 0,
        salesCount: dayData?.salesCount || 0,
      };
    });

    weeklyStatsByWeek[cw.index] = stats;
  }

  const todayStr = formatDateYMD(new Date());
  let defaultWeekIndex = 0;
  for (let i = 0; i < calendarWeeks.length; i++) {
    if (todayStr >= calendarWeeks[i].startDate && todayStr <= calendarWeeks[i].endDate) {
      defaultWeekIndex = i;
      break;
    }
  }

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
  };
}

export async function getGeneralDashboardData(
  year: number,
  month: number = new Date().getMonth()
): Promise<GeneralDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Calcula todas as semanas (Domingo a Sábado) que intersectam o mês selecionado
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0: Dom, 1: Seg, ..., 6: Sáb
  const diffToSunday = -firstDayOfWeek;
  const initialSunday = new Date(year, month, 1 + diffToSunday);

  const lastDayOfMonth = new Date(year, month + 1, 0);

  const calendarWeeks: {
    index: number;
    label: string;
    shortLabel: string;
    startDate: string;
    endDate: string;
    days: {
      dateStr: string;
      weekdayLabel: string;
      fullLabel: string;
    }[];
  }[] = [];

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullWeekdayNames = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  const iterDate = new Date(initialSunday);
  let wIdx = 0;

  while (iterDate <= lastDayOfMonth) {
    const weekStart = new Date(iterDate); // Domingo
    const sundayStr = formatDateYMD(weekStart);
    const days = [];

    // 7 dias: Domingo (0) até Sábado (6)
    for (let d = 0; d < 7; d++) {
      const cur = new Date(weekStart);
      cur.setDate(cur.getDate() + d);
      const dateStr = formatDateYMD(cur);
      const dayNum = String(cur.getDate()).padStart(2, '0');
      const mNum = String(cur.getMonth() + 1).padStart(2, '0');
      const dayOfWeek = cur.getDay();

      days.push({
        dateStr,
        weekdayLabel: weekdayNames[dayOfWeek],
        fullLabel: `${fullWeekdayNames[dayOfWeek]} (${dayNum}/${mNum})`,
      });
    }

    const saturdayDate = new Date(weekStart);
    saturdayDate.setDate(saturdayDate.getDate() + 6);
    const saturdayStr = formatDateYMD(saturdayDate);

    const startDisplay = `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
    const endDisplay = `${String(saturdayDate.getDate()).padStart(2, '0')}/${String(saturdayDate.getMonth() + 1).padStart(2, '0')}`;

    calendarWeeks.push({
      index: wIdx,
      label: `Semana ${wIdx + 1} (${startDisplay} a ${endDisplay})`,
      shortLabel: `${startDisplay} - ${endDisplay}`,
      startDate: sundayStr,
      endDate: saturdayStr,
      days,
    });

    wIdx++;
    iterDate.setDate(iterDate.getDate() + 7);
  }

  // Define os limites abrangentes para a query
  const earliestDate = calendarWeeks.length > 0 && calendarWeeks[0].startDate < startDate
    ? calendarWeeks[0].startDate
    : startDate;
  const latestDate = calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].endDate > endDate
    ? calendarWeeks[calendarWeeks.length - 1].endDate
    : endDate;

  const queryStartDate = earliestDate;
  const queryEndDate = latestDate;
  const salesQueryStart = `${queryStartDate}T00:00:00.000Z`;
  const salesQueryEnd = `${queryEndDate}T23:59:59.999Z`;

  const [
    { data: txData, error: txError },
    { data: salesData, error: salesError },
    { data: accountsData, error: accountsError },
    { data: accountTxData, error: accountTxError },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, amount, type, is_paid, due_date')
      .eq('user_id', user.id)
      .gte('due_date', queryStartDate)
      .lte('due_date', queryEndDate),
    supabase
      .from('sales')
      .select('total_amount, sale_date')
      .eq('user_id', user.id)
      .gte('sale_date', salesQueryStart)
      .lte('sale_date', salesQueryEnd),
    supabase
      .from('accounts')
      .select('id, initial_balance')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('amount, type, due_date')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .not('account_id', 'is', null)
      .lte('due_date', queryEndDate),
  ]);

  if (txError) console.error('Erro ao buscar transações:', txError);
  if (salesError) console.error('Erro ao buscar vendas:', salesError);
  if (accountsError) console.error('Erro ao buscar contas:', accountsError);
  if (accountTxError) console.error('Erro ao buscar transações de contas:', accountTxError);

  // Mapeamento por data YYYY-MM-DD
  const salesByDate = new Map<string, number>();
  if (salesData) {
    for (const s of salesData) {
      if (!s.sale_date) continue;
      const dStr = s.sale_date.split('T')[0];
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

  const initialBalanceSum = (accountsData || []).reduce(
    (acc, a) => acc + (Number(a.initial_balance) || 0),
    0
  );

  const accountDeltasByDate = new Map<string, number>();
  let basePriorBalance = initialBalanceSum;

  if (accountTxData) {
    for (const t of accountTxData) {
      if (!t.due_date) continue;
      const amt = Number(t.amount) || 0;
      const signedAmt = t.type === 'income' ? amt : -amt;

      if (t.due_date < queryStartDate) {
        basePriorBalance += signedAmt;
      } else {
        accountDeltasByDate.set(t.due_date, (accountDeltasByDate.get(t.due_date) || 0) + signedAmt);
      }
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
  const monthlyStats: PeriodStat[] = calendarWeeks.map((cw, i) => {
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

  const todayStr = formatDateYMD(new Date());
  let defaultWeekIndex = 0;
  for (let i = 0; i < calendarWeeks.length; i++) {
    if (todayStr >= calendarWeeks[i].startDate && todayStr <= calendarWeeks[i].endDate) {
      defaultWeekIndex = i;
      break;
    }
  }

  const weeksMeta: WeekMeta[] = calendarWeeks.map((cw) => ({
    index: cw.index,
    label: cw.label,
    shortLabel: cw.shortLabel,
    startDate: cw.startDate,
    endDate: cw.endDate,
  }));

  return {
    yearlyStats,
    monthlyStats,
    weeklyStatsByWeek,
    weeksMeta,
    defaultWeekIndex,
  };
}

