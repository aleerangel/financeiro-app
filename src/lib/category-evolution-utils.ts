export interface RawEvolutionTransaction {
  id?: string;
  amount: number;
  type: 'income' | 'expense';
  is_paid: boolean;
  due_date: string;
  description?: string;
  notes?: string | null;
  recurrence_id?: string | null;
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
  isVariable?: boolean;
  monthlyRealized: number[]; // 12 meses (Jan = 0 .. Dez = 11)
  monthlyTotal: number[]; // 12 meses (Jan = 0 .. Dez = 11)
  dailyRealized?: number[][]; // [12][31] acumulado por dia (dia 1 = idx 0 .. dia 31 = idx 30)
  dailyTotal?: number[][]; // [12][31]
}

export interface CategoryEvolutionMetrics {
  key: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  isVariable: boolean;
  isSameDayComparison: boolean;
  comparisonCutoffDay: number | null;
  monthlyValues: number[];
  currentValue: number;
  previousValue: number;
  hasPreviousMonth: boolean;
  momDelta: number;
  momPct: number | null;
  yearlyTotal: number;
  activeMonthsCount: number;
  monthlyAverage: number;
  fullMonthlyAverage: number;
  vsAverageDelta: number;
  vsAveragePct: number | null;
  averageStatus: 'above' | 'below' | 'on_average' | 'no_history';
}

export interface ComputeEvolutionOptions {
  referenceDate?: Date;
  selectedYear?: number;
  cutoffDay?: number;
}

const FIXED_INCOME_KEYWORDS = [
  'salário',
  'salario',
  'aposentadoria',
  'pensão',
  'pensao',
  'aluguel fixo',
  'pró-labore',
  'pro-labore',
];

export function isVariableIncomeCategoryName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) return true;
  return !FIXED_INCOME_KEYWORDS.some((kw) => lower.includes(kw));
}

export function resolveTransactionCategoryInfo(tx: RawEvolutionTransaction): {
  key: string;
  name: string;
  color: string;
  isVariable: boolean;
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
        isVariable: true,
      };
    }

    const name = tx.category?.name?.trim() || 'Outras Receitas';
    const color = tx.category?.color || '#3b82f6';
    return {
      key: `income:${name.toLowerCase()}`,
      name,
      color,
      isVariable: isVariableIncomeCategoryName(name),
    };
  }

  const name = tx.category?.name?.trim() || 'Outras Despesas';
  const color = tx.category?.color || '#64748b';
  return {
    key: `expense:${name.toLowerCase()}`,
    name,
    color,
    isVariable: false,
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
    if (parts.length < 3) continue;
    const monthIndex = Number(parts[1]) - 1;
    const dayIndex = Math.min(30, Math.max(0, Number(parts[2]) - 1));
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
        isVariable: info.isVariable,
        monthlyRealized: Array(12).fill(0),
        monthlyTotal: Array(12).fill(0),
        dailyRealized: Array.from({ length: 12 }, () => Array(31).fill(0)),
        dailyTotal: Array.from({ length: 12 }, () => Array(31).fill(0)),
      };
      targetMap.set(info.key, item);
    }

    item.monthlyTotal[monthIndex] += amount;
    if (item.dailyTotal) {
      item.dailyTotal[monthIndex][dayIndex] += amount;
    }

    if (tx.is_paid) {
      item.monthlyRealized[monthIndex] += amount;
      if (item.dailyRealized) {
        item.dailyRealized[monthIndex][dayIndex] += amount;
      }
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

function sumDaysUpTo(
  dailyMatrix: number[][] | undefined,
  monthIdx: number,
  cutoffDay: number
): number {
  if (!dailyMatrix || !dailyMatrix[monthIdx]) return 0;
  const maxIdx = Math.min(30, Math.max(0, cutoffDay - 1));
  let sum = 0;
  for (let d = 0; d <= maxIdx; d++) {
    sum += dailyMatrix[monthIdx][d] || 0;
  }
  return sum;
}

export function computeCategoryEvolutionMetrics(
  item: CategoryMonthlyEvolutionItem,
  currentMonth: number,
  mode: 'realized' | 'total' = 'realized',
  options?: ComputeEvolutionOptions
): CategoryEvolutionMetrics {
  const monthlyValues =
    mode === 'realized' ? item.monthlyRealized : item.monthlyTotal;
  const dailyMatrix =
    mode === 'realized' ? item.dailyRealized : item.dailyTotal;
  const safeMonth = Math.min(11, Math.max(0, currentMonth));

  const now = options?.referenceDate || new Date();
  const selectedYear = options?.selectedYear ?? now.getFullYear();
  const isCurrentInProgressMonth =
    selectedYear === now.getFullYear() && safeMonth === now.getMonth();

  const isVariable = Boolean(
    item.isVariable ??
      (item.type === 'income' && isVariableIncomeCategoryName(item.name))
  );

  const explicitCutoffDay =
    options?.cutoffDay ?? (isCurrentInProgressMonth ? now.getDate() : null);

  const hasDailyData = Boolean(dailyMatrix && dailyMatrix.length === 12);
  const isSameDayComparison = Boolean(
    isVariable &&
      item.type === 'income' &&
      hasDailyData &&
      explicitCutoffDay !== null &&
      explicitCutoffDay >= 1 &&
      explicitCutoffDay <= 31
  );

  const comparisonCutoffDay = isSameDayComparison ? explicitCutoffDay : null;

  const currentValue = monthlyValues[safeMonth] || 0;
  const currentComparisonValue =
    isSameDayComparison && comparisonCutoffDay !== null
      ? sumDaysUpTo(dailyMatrix, safeMonth, comparisonCutoffDay)
      : currentValue;

  const hasPreviousMonth = safeMonth > 0;
  const previousValue = hasPreviousMonth
    ? isSameDayComparison && comparisonCutoffDay !== null
      ? sumDaysUpTo(dailyMatrix, safeMonth - 1, comparisonCutoffDay)
      : monthlyValues[safeMonth - 1] || 0
    : 0;

  const momDelta = hasPreviousMonth
    ? currentComparisonValue - previousValue
    : 0;
  const momPct =
    hasPreviousMonth && previousValue > 0
      ? ((currentComparisonValue - previousValue) / previousValue) * 100
      : null;

  const yearlyTotal = monthlyValues.reduce((acc, v) => acc + v, 0);
  const activeMonthsCount = monthlyValues.filter((v) => v > 0).length;
  const fullMonthlyAverage =
    activeMonthsCount > 0 ? yearlyTotal / activeMonthsCount : 0;

  let monthlyAverage = fullMonthlyAverage;
  let comparisonMonthCount = activeMonthsCount;

  if (isSameDayComparison && comparisonCutoffDay !== null) {
    // Meses anteriores/outros meses que tiveram movimentação na categoria
    const otherActiveMonthIndices: number[] = [];
    for (let m = 0; m < 12; m++) {
      if (m !== safeMonth && (monthlyValues[m] || 0) > 0) {
        otherActiveMonthIndices.push(m);
      }
    }

    if (otherActiveMonthIndices.length > 0) {
      const sumOtherMonthsSameDay = otherActiveMonthIndices.reduce(
        (acc, mIdx) =>
          acc + sumDaysUpTo(dailyMatrix, mIdx, comparisonCutoffDay),
        0
      );
      monthlyAverage = sumOtherMonthsSameDay / otherActiveMonthIndices.length;
      comparisonMonthCount = otherActiveMonthIndices.length + 1;
    } else {
      monthlyAverage = currentComparisonValue;
      comparisonMonthCount = currentComparisonValue > 0 ? 1 : 0;
    }
  }

  const vsAverageDelta = currentComparisonValue - monthlyAverage;
  const vsAveragePct =
    monthlyAverage > 0
      ? ((currentComparisonValue - monthlyAverage) / monthlyAverage) * 100
      : null;

  let averageStatus: CategoryEvolutionMetrics['averageStatus'] = 'no_history';

  if (comparisonMonthCount >= 2 && monthlyAverage > 0) {
    if (vsAveragePct !== null && vsAveragePct > 3) {
      averageStatus = 'above';
    } else if (vsAveragePct !== null && vsAveragePct < -3) {
      averageStatus = 'below';
    } else {
      averageStatus = 'on_average';
    }
  } else if (comparisonMonthCount === 1 && currentComparisonValue > 0) {
    averageStatus = 'on_average';
  }

  return {
    key: item.key,
    name: item.name,
    color: item.color,
    type: item.type,
    isVariable,
    isSameDayComparison,
    comparisonCutoffDay,
    monthlyValues,
    currentValue,
    previousValue,
    hasPreviousMonth,
    momDelta,
    momPct,
    yearlyTotal,
    activeMonthsCount,
    monthlyAverage,
    fullMonthlyAverage,
    vsAverageDelta,
    vsAveragePct,
    averageStatus,
  };
}
