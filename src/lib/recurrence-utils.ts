import { getZonedParts } from './date-utils';

export interface RecurrenceLike {
  created_at: string;
  frequency?: string | null;
}

/**
 * Uma recorrência só gera lançamentos a partir do mês em que foi criada
 * (mês avaliado no fuso do app). Recorrências anuais só geram no mês de criação.
 * `month` é 0-indexado.
 */
export function isRecurrenceEligible(rec: RecurrenceLike, month: number, year: number): boolean {
  const created = getZonedParts(new Date(rec.created_at));

  if (year < created.year || (year === created.year && month < created.month)) {
    return false;
  }

  if (rec.frequency === 'yearly' && month !== created.month) {
    return false;
  }

  return true;
}

/** Primeiro dia (YYYY-MM-01) do mês de criação da recorrência, no fuso do app. */
export function getCreationMonthStart(createdAt: string): string {
  const { year, month } = getZonedParts(new Date(createdAt));
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** Data de vencimento YYYY-MM-DD ajustando dias inexistentes (ex.: 31 em fevereiro). */
export function buildDueDate(year: number, month: number, dueDay: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

