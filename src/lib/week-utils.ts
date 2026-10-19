import { formatDateYMD, getTodayYMD } from './date-utils';

export interface CalendarWeek {
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
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FULL_WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Semanas (Domingo a Sábado) que intersectam o mês informado.
 * `month` é 0-indexado.
 */
export function buildCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const initialSunday = new Date(year, month, 1 - firstDayOfMonth.getDay());
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const weeks: CalendarWeek[] = [];
  const iterDate = new Date(initialSunday);
  let wIdx = 0;

  while (iterDate <= lastDayOfMonth) {
    const weekStart = new Date(iterDate);
    const days: CalendarWeek['days'] = [];

    for (let d = 0; d < 7; d++) {
      const cur = new Date(weekStart);
      cur.setDate(cur.getDate() + d);
      const dow = cur.getDay();
      days.push({
        dateStr: formatDateYMD(cur),
        weekdayLabel: WEEKDAY_NAMES[dow],
        fullLabel: `${FULL_WEEKDAY_NAMES[dow]} (${pad(cur.getDate())}/${pad(cur.getMonth() + 1)})`,
      });
    }

    const saturday = new Date(weekStart);
    saturday.setDate(saturday.getDate() + 6);

    const startDisplay = `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)}`;
    const endDisplay = `${pad(saturday.getDate())}/${pad(saturday.getMonth() + 1)}`;

    weeks.push({
      index: wIdx,
      label: `Semana ${wIdx + 1} (${startDisplay} a ${endDisplay})`,
      shortLabel: `${startDisplay} - ${endDisplay}`,
      startDate: formatDateYMD(weekStart),
      endDate: formatDateYMD(saturday),
      days,
    });

    wIdx++;
    iterDate.setDate(iterDate.getDate() + 7);
  }

  return weeks;
}

/** Índice da semana que contém "hoje" (fuso do app); 0 se não estiver no mês. */
export function findDefaultWeekIndex(weeks: CalendarWeek[], now: Date = new Date()): number {
  const today = getTodayYMD(now);
  const idx = weeks.findIndex((w) => today >= w.startDate && today <= w.endDate);
  return idx === -1 ? 0 : idx;
}
