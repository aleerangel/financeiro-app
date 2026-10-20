export interface RawEvolutionTransaction {
  id?: string;
  amount: number;
  type: 'income' | 'expense';
  is_paid: boolean;
  due_date: string;
  description?: string;
  notes?: string | null;
  category?: {
    id?: string;
    name?: string;
    color?: string | null;
  } | null;
}

export interface CategoryMonthlyEvolutionItem {
  key: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  monthlyRealized: number[]; // 12 meses (Jan = 0 .. Dez = 11)
  monthlyTotal: number[]; // 12 meses (Jan = 0 .. Dez = 11)
}

export interface CategoryEvolutionMetrics {
  key: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  monthlyValues: number[];
  currentValue: number;
  previousValue: number;
  hasPreviousMonth: boolean;
  momDelta: number;
  momPct: number | null;
  yearlyTotal: number;
  activeMonthsCount: number;
  monthlyAverage: number;
  vsAverageDelta: number;
  vsAveragePct: number | null;
  averageStatus: 'above' | 'below' | 'on_average' | 'no_history';
}

export function resolveTransactionCategoryInfo(tx: RawEvolutionTransaction): {
  key: string;
  name: string;
  color: string;
} {
  if (tx.type === 'income') {
    const desc = tx.description || '';
    const notes = tx.notes || '';
    const catNameLower = (tx.category?.name || '').toLowerCase();

    const isBarber =
      desc.toLowerCase().includes('atendimento') ||
      notes.includes('Atendimento') ||
      notes.includes('Comanda:') ||
      catNameLower.includes('barbearia') ||
      catNameLower.includes('serviço');

    if (isBarber) {
      return {
        key: 'income:barbearia',
        name: 'Barbearia (Serviços)',
        color: '#10b981',
      };
    }

    const name = tx.category?.name?.trim() || 'Outras Receitas';
    const color = tx.category?.color || '#3b82f6';
    return {
      key: `income:${name.toLowerCase()}`,
      name,
      color,
    };
  }

  const name = tx.category?.name?.trim() || 'Outras Despesas';
  const color = tx.category?.color || '#64748b';
  return {
    key: `expense:${name.toLowerCase()}`,
    name,
    color,
  };
}

export function buildYearlyCategoryEvolution(
  transactions: RawEvolutionTransaction[],
  year: number
): {
  incomeCategories: CategoryMonthlyEvolutionItem[];
  expenseCategories: CategoryMonthlyEvolutionItem[];
} {
  const incomeMap = new Map<string, CategoryMonthlyEvolutionItem>();
  const expenseMap = new Map<string, CategoryMonthlyEvolutionItem>();

  const yearPrefix = `${year}-`;

  for (const tx of transactions) {
    if (!tx.due_date || !tx.due_date.startsWith(yearPrefix)) continue;

    const parts = tx.due_date.split('-');
    if (parts.length < 2) continue;
    const monthIndex = Number(parts[1]) - 1;
    if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) continue;

    const amount = Number(tx.amount) || 0;
    if (amount <= 0) continue;

    const info = resolveTransactionCategoryInfo(tx);
    const targetMap = tx.type === 'income' ? incomeMap : expenseMap;

    let item = targetMap.get(info.key);
    if (!item) {
      item = {
        key: info.key,
        name: info.name,
        color: info.color,
        type: tx.type,
        monthlyRealized: Array(12).fill(0),
        monthlyTotal: Array(12).fill(0),
      };
      targetMap.set(info.key, item);
    }

    item.monthlyTotal[monthIndex] += amount;
    if (tx.is_paid) {
      item.monthlyRealized[monthIndex] += amount;
    }
  }

  const sortByYearlyTotal = (
    a: CategoryMonthlyEvolutionItem,
    b: CategoryMonthlyEvolutionItem
  ) => {
    const sumA = a.monthlyTotal.reduce((acc, v) => acc + v, 0);
    const sumB = b.monthlyTotal.reduce((acc, v) => acc + v, 0);
    return sumB - sumA;
  };

  return {
    incomeCategories: Array.from(incomeMap.values()).sort(sortByYearlyTotal),
    expenseCategories: Array.from(expenseMap.values()).sort(sortByYearlyTotal),
  };
}

export function computeCategoryEvolutionMetrics(
  item: CategoryMonthlyEvolutionItem,
  currentMonth: number,
  mode: 'realized' | 'total' = 'realized'
): CategoryEvolutionMetrics {
  const monthlyValues = mode === 'realized' ? item.monthlyRealized : item.monthlyTotal;
  const safeMonth = Math.min(11, Math.max(0, currentMonth));

  const currentValue = monthlyValues[safeMonth] || 0;
  const hasPreviousMonth = safeMonth > 0;
  const previousValue = hasPreviousMonth ? monthlyValues[safeMonth - 1] || 0 : 0;

  const momDelta = hasPreviousMonth ? currentValue - previousValue : 0;
  const momPct =
    hasPreviousMonth && previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : null;

  const yearlyTotal = monthlyValues.reduce((acc, v) => acc + v, 0);

  // Calcula a média considerando os meses com movimentação no ano (evita diluir por meses futuros vazios)
  const activeMonthsCount = monthlyValues.filter((v) => v > 0).length;
  const monthlyAverage = activeMonthsCount > 0 ? yearlyTotal / activeMonthsCount : 0;

  const vsAverageDelta = currentValue - monthlyAverage;
  const vsAveragePct =
    monthlyAverage > 0 ? ((currentValue - monthlyAverage) / monthlyAverage) * 100 : null;

  let averageStatus: CategoryEvolutionMetrics['averageStatus'] = 'no_history';

  if (activeMonthsCount >= 2 && monthlyAverage > 0) {
    if (vsAveragePct !== null && vsAveragePct > 3) {
      averageStatus = 'above';
    } else if (vsAveragePct !== null && vsAveragePct < -3) {
      averageStatus = 'below';
    } else {
      averageStatus = 'on_average';
    }
  } else if (activeMonthsCount === 1 && currentValue > 0) {
    averageStatus = 'on_average';
  }

  return {
    key: item.key,
    name: item.name,
    color: item.color,
    type: item.type,
    monthlyValues,
    currentValue,
    previousValue,
    hasPreviousMonth,
    momDelta,
    momPct,
    yearlyTotal,
    activeMonthsCount,
    monthlyAverage,
    vsAverageDelta,
    vsAveragePct,
    averageStatus,
  };
}
