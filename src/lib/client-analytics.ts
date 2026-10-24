import { getZonedParts, getTodayYMD } from './date-utils';
import { PaymentMethod } from '@/types/database';

export type ClientReturnStatus = 'in_window' | 'overdue' | 'missing' | 'on_track' | 'new';

export interface RawClientSaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface RawClientSaleAmortization {
  id: string;
  amount: number;
  payment_method: string;
  amortized_at: string;
  notes?: string | null;
}

export interface RawClientSale {
  id: string;
  total_amount: number;
  sale_date: string;
  payment_method?: PaymentMethod | 'on_credit';
  status?: 'paid' | 'pending' | 'partially_paid';
  due_date?: string | null;
  paid_amount?: number;
  remaining_amount?: number;
  notes?: string | null;
  items?: RawClientSaleItem[];
  amortizations?: RawClientSaleAmortization[];
}

export interface FavoriteItemStat {
  name: string;
  count: number;
  totalSpent: number;
}

export interface ClientAnalytics {
  status: ClientReturnStatus;
  statusLabel: string;
  /** Intervalo médio estimado em dias (null se nunca visitou) */
  cycleDays: number | null;
  /** true quando o cliente só tem 1 visita e usa o ciclo base de 21d */
  isEstimatedCycle: boolean;
  /** Margem da janela (± dias) */
  windowMarginDays: number | null;
  /** Data central prevista do próximo retorno (YYYY-MM-DD) */
  expectedNextDate: string | null;
  /** Início da janela prevista (YYYY-MM-DD) */
  windowStartDate: string | null;
  /** Fim da janela prevista (YYYY-MM-DD) */
  windowEndDate: string | null;
  /** Dias corridos desde a última visita */
  daysSinceLastVisit: number | null;
  /** Dias restantes até a data central prevista (negativo = passou da data central) */
  daysUntilExpected: number | null;
  /** Até 2 dias da semana mais prováveis (ex: ['Sex', 'Sáb']) */
  preferredWeekdays: string[];
  /** Nome completo dos dias mais prováveis (ex: ['Sexta', 'Sábado']) */
  preferredWeekdaysFull: string[];
  /** Top 3 serviços/produtos mais consumidos */
  favoriteItems: FavoriteItemStat[];
  /** Quantidade de dias distintos em que o cliente visitou */
  distinctVisitDays: number;
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MIN_CYCLE_DAYS = 5;
const MAX_CYCLE_DAYS = 90;

export const CLIENT_STATUS_LABELS: Record<ClientReturnStatus, string> = {
  in_window: 'Na Janela',
  overdue: 'Atrasado',
  missing: 'Sumido',
  on_track: 'Em Dia',
  new: 'Novo',
};

/** Converte YYYY-MM-DD em timestamp UTC meia-noite para aritmética exata de dias. */
function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Soma `days` a uma string YYYY-MM-DD e devolve YYYY-MM-DD. */
export function addDaysYMD(ymd: string, days: number): string {
  const ms = ymdToUtcMs(ymd) + days * 86_400_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Diferença em dias inteiros (b - a) entre duas datas YYYY-MM-DD. */
export function diffDaysYMD(aYmd: string, bYmd: string): number {
  return Math.round((ymdToUtcMs(bYmd) - ymdToUtcMs(aYmd)) / 86_400_000);
}

/** Extrai YYYY-MM-DD de um ISO timestamp ou string de data no fuso do app. */
export function saleDateToYMD(saleDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
    return saleDate;
  }
  const parsed = new Date(saleDate);
  if (Number.isNaN(parsed.getTime())) {
    return saleDate.split('T')[0];
  }
  const { year, month, day } = getZonedParts(parsed);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Dia da semana (0 = Dom .. 6 = Sáb) de uma string YYYY-MM-DD. */
function weekdayOfYMD(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Calcula o ciclo de retorno ponderado (dando mais peso aos últimos intervalos)
 * a partir de uma lista ordenada crescente de datas únicas YYYY-MM-DD.
 */
export function computeWeightedCycleDays(sortedUniqueDates: string[]): number | null {
  // Clientes com menos de 2 visitas distintas não possuem intervalo para definição de ciclo
  if (sortedUniqueDates.length < 2) return null;

  const rawIntervals: number[] = [];
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const diff = diffDaysYMD(sortedUniqueDates[i - 1], sortedUniqueDates[i]);
    if (diff > 0) rawIntervals.push(diff);
  }

  if (rawIntervals.length === 0) return null;

  // Se houver intervalos regulares (<= 120 dias), descarta pausas extremas (> 120 dias)
  const regular = rawIntervals.filter((d) => d <= 120);
  const effective = regular.length > 0 ? regular : rawIntervals;

  // Considera os últimos 4 intervalos com pesos crescentes (1, 2, 3, 4)
  const recent = effective.slice(-4);
  let weightedSum = 0;
  let totalWeight = 0;
  recent.forEach((interval, idx) => {
    const weight = idx + 1;
    weightedSum += interval * weight;
    totalWeight += weight;
  });

  const avg = Math.round(weightedSum / totalWeight);
  return Math.max(MIN_CYCLE_DAYS, Math.min(MAX_CYCLE_DAYS, avg));
}

/**
 * Extrai até 2 dias da semana mais frequentes a partir das datas únicas de visita.
 */
export function computePreferredWeekdays(uniqueDates: string[]): {
  short: string[];
  full: string[];
} {
  if (uniqueDates.length === 0) return { short: [], full: [] };

  const counts = new Map<number, number>();
  for (const ymd of uniqueDates) {
    const dow = weekdayOfYMD(ymd);
    counts.set(dow, (counts.get(dow) || 0) + 1);
  }

  const total = uniqueDates.length;
  const minThreshold = total >= 4 ? Math.ceil(total * 0.25) : 1;

  const ranked = Array.from(counts.entries())
    .filter(([, count]) => count >= minThreshold)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 2);

  return {
    short: ranked.map(([dow]) => WEEKDAY_SHORT[dow]),
    full: ranked.map(([dow]) => WEEKDAY_FULL[dow]),
  };
}

/**
 * Analisa todo o histórico de vendas de um cliente e retorna o diagnóstico preditivo.
 */
export function analyzeClientSales(
  sales: RawClientSale[],
  now: Date = new Date(),
  customCycleDays?: number | null
): ClientAnalytics {
  if (!sales || sales.length === 0) {
    return {
      status: 'new',
      statusLabel: CLIENT_STATUS_LABELS.new,
      cycleDays: null,
      isEstimatedCycle: false,
      windowMarginDays: null,
      expectedNextDate: null,
      windowStartDate: null,
      windowEndDate: null,
      daysSinceLastVisit: null,
      daysUntilExpected: null,
      preferredWeekdays: [],
      preferredWeekdaysFull: [],
      favoriteItems: [],
      distinctVisitDays: 0,
    };
  }

  // Datas únicas ordenadas crescentemente
  const uniqueDates = Array.from(new Set(sales.map((s) => saleDateToYMD(s.sale_date)))).sort();
  const distinctVisitDays = uniqueDates.length;
  const lastVisitYmd = uniqueDates[uniqueDates.length - 1];
  const todayYmd = getTodayYMD(now);

  const daysSinceLastVisit = Math.max(0, diffDaysYMD(lastVisitYmd, todayYmd));

  // Dias da semana preferidos
  const weekdays = computePreferredWeekdays(uniqueDates);

  // Top 3 serviços/produtos favoritos
  const itemMap = new Map<string, FavoriteItemStat>();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const key = item.product_name.trim();
      const existing = itemMap.get(key) || { name: key, count: 0, totalSpent: 0 };
      existing.count += Number(item.quantity) || 1;
      existing.totalSpent += Number(item.total_price) || 0;
      itemMap.set(key, existing);
    }
  }

  const favoriteItems = Array.from(itemMap.values())
    .sort((a, b) => b.count - a.count || b.totalSpent - a.totalSpent)
    .slice(0, 3);

  // Clientes com apenas 1 atendimento não possuem histórico suficiente para definir ciclo ou retorno
  if (distinctVisitDays < 2) {
    return {
      status: 'new',
      statusLabel: CLIENT_STATUS_LABELS.new,
      cycleDays: null,
      isEstimatedCycle: false,
      windowMarginDays: null,
      expectedNextDate: null,
      windowStartDate: null,
      windowEndDate: null,
      daysSinceLastVisit,
      daysUntilExpected: null,
      preferredWeekdays: weekdays.short,
      preferredWeekdaysFull: weekdays.full,
      favoriteItems,
      distinctVisitDays,
    };
  }

  const computedCycle = computeWeightedCycleDays(uniqueDates);
  const cycleDays =
    computedCycle ||
    (customCycleDays && customCycleDays >= MIN_CYCLE_DAYS
      ? Math.min(MAX_CYCLE_DAYS, customCycleDays)
      : null);
  if (!cycleDays) {
    return {
      status: 'new',
      statusLabel: CLIENT_STATUS_LABELS.new,
      cycleDays: null,
      isEstimatedCycle: false,
      windowMarginDays: null,
      expectedNextDate: null,
      windowStartDate: null,
      windowEndDate: null,
      daysSinceLastVisit,
      daysUntilExpected: null,
      preferredWeekdays: weekdays.short,
      preferredWeekdaysFull: weekdays.full,
      favoriteItems,
      distinctVisitDays,
    };
  }

  const windowMarginDays = Math.max(2, Math.min(5, Math.round(cycleDays * 0.15)));
  const expectedNextDate = addDaysYMD(lastVisitYmd, cycleDays);
  const windowStartDate = addDaysYMD(expectedNextDate, -windowMarginDays);
  const windowEndDate = addDaysYMD(expectedNextDate, windowMarginDays);
  const daysUntilExpected = cycleDays - daysSinceLastVisit;

  // Classificação na máquina de estados (somente clientes com 2+ visitas chegam aqui!)
  const windowMin = cycleDays - windowMarginDays;
  const windowMax = cycleDays + windowMarginDays;
  const missingThreshold = Math.max(cycleDays * 2, 40);

  let status: ClientReturnStatus;
  if (daysSinceLastVisit >= windowMin && daysSinceLastVisit <= windowMax) {
    status = 'in_window';
  } else if (daysSinceLastVisit > windowMax && daysSinceLastVisit < missingThreshold) {
    status = 'overdue';
  } else if (daysSinceLastVisit >= missingThreshold) {
    status = 'missing';
  } else {
    status = 'on_track';
  }

  return {
    status,
    statusLabel: CLIENT_STATUS_LABELS[status],
    cycleDays,
    isEstimatedCycle: false,
    windowMarginDays,
    expectedNextDate,
    windowStartDate,
    windowEndDate,
    daysSinceLastVisit,
    daysUntilExpected,
    preferredWeekdays: weekdays.short,
    preferredWeekdaysFull: weekdays.full,
    favoriteItems,
    distinctVisitDays,
  };
}

/**
 * Determina quais clientes recebem o selo VIP:
 * - Pelo menos 5 atendimentos realizados, OU
 * - Está no Top 20% de faturamento (entre clientes com gasto > 0 e pelo menos 2 visitas).
 */
export function computeVipClientIds(
  clients: { id: string; totalSalesCount: number; totalSpent: number }[]
): Set<string> {
  const vipIds = new Set<string>();

  for (const c of clients) {
    if (c.totalSalesCount >= 5) {
      vipIds.add(c.id);
    }
  }

  const activeSpenders = clients
    .filter((c) => c.totalSpent > 0 && c.totalSalesCount >= 2)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  if (activeSpenders.length > 0) {
    const topCount = Math.max(1, Math.ceil(activeSpenders.length * 0.2));
    for (let i = 0; i < topCount; i++) {
      vipIds.add(activeSpenders[i].id);
    }
  }

  return vipIds;
}

/** Prioridade de ordenação para a visão padrão ("Radar de Retorno") */
export function getReturnPriorityScore(status: ClientReturnStatus): number {
  switch (status) {
    case 'in_window':
      return 1;
    case 'overdue':
      return 2;
    case 'on_track':
      return 3;
    case 'new':
      return 4;
    case 'missing':
      return 5;
  }
}

