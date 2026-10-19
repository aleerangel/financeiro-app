/**
 * Utilitários de data com fuso horário fixo do app.
 * O servidor (Vercel) roda em UTC, então nunca usar getMonth()/getDate() de
 * `new Date()` para decidir "hoje" ou "mês atual" no servidor.
 */

export const APP_TIMEZONE = 'America/Sao_Paulo';

export interface DateParts {
  year: number;
  /** 0-indexado (0 = Janeiro), igual ao Date#getMonth */
  month: number;
  day: number;
}

/** Retorna ano/mês/dia de um instante no fuso do app. */
export function getZonedParts(date: Date = new Date(), timeZone: string = APP_TIMEZONE): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return { year: get('year'), month: get('month') - 1, day: get('day') };
}

/** Formata Date usando os campos locais (sem conversão de fuso). */
export function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "Hoje" como YYYY-MM-DD no fuso do app. */
export function getTodayYMD(now: Date = new Date()): string {
  const { year, month, day } = getZonedParts(now);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** true se (month, year) é anterior ao mês corrente no fuso do app. */
export function isPastMonth(month: number, year: number, now: Date = new Date()): boolean {
  const cur = getZonedParts(now);
  return year < cur.year || (year === cur.year && month < cur.month);
}
