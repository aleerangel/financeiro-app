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

export interface DateTimeParts extends DateParts {
  hour: number;
  minute: number;
  second: number;
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

/** Retorna ano/mês/dia/hora/minuto/segundo de um instante no fuso do app. */
export function getZonedTimeParts(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): DateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);

  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
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

/**
 * Converte um Date ou string ISO (ex: '2026-10-21T00:30:00Z') para YYYY-MM-DD
 * no fuso horário do app (America/Sao_Paulo), evitando deslocar vendas noturnas (após 21h).
 */
export function getZonedYMD(
  dateOrIso: Date | string,
  timeZone: string = APP_TIMEZONE
): string {
  if (typeof dateOrIso === 'string') {
    const trimmed = dateOrIso.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed.slice(0, 10);
    }
    const { year, month, day } = getZonedParts(parsed, timeZone);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const { year, month, day } = getZonedParts(dateOrIso, timeZone);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Retorna os limites ISO (início 00:00:00.000 e fim 23:59:59.999) no fuso de São Paulo (-03:00)
 * para um intervalo de datas YYYY-MM-DD.
 */
export function getZonedRangeBoundsIso(
  startYmd: string,
  endYmd: string = startYmd
): { startIso: string; endIso: string } {
  return {
    startIso: `${startYmd}T00:00:00.000-03:00`,
    endIso: `${endYmd}T23:59:59.999-03:00`,
  };
}

/**
 * Resolve o timestamp ISO e a data YYYY-MM-DD (em America/Sao_Paulo) de uma venda/atendimento.
 */
export function resolveSaleTimestamps(
  saleDateInput?: string,
  now: Date = new Date()
): { saleDateIso: string; dateOnlyStr: string } {
  if (saleDateInput) {
    const trimmed = saleDateInput.trim();
    if (trimmed.includes('T')) {
      const parsed = new Date(trimmed);
      return {
        saleDateIso: parsed.toISOString(),
        dateOnlyStr: getZonedYMD(parsed),
      };
    }

    const t = getZonedTimeParts(now);
    const hh = String(t.hour).padStart(2, '0');
    const mm = String(t.minute).padStart(2, '0');
    const ss = String(t.second).padStart(2, '0');
    const composed = new Date(`${trimmed}T${hh}:${mm}:${ss}-03:00`);
    return {
      saleDateIso: Number.isNaN(composed.getTime()) ? now.toISOString() : composed.toISOString(),
      dateOnlyStr: trimmed,
    };
  }

  return {
    saleDateIso: now.toISOString(),
    dateOnlyStr: getTodayYMD(now),
  };
}

/** true se (month, year) é anterior ao mês corrente no fuso do app. */
export function isPastMonth(month: number, year: number, now: Date = new Date()): boolean {
  const cur = getZonedParts(now);
  return year < cur.year || (year === cur.year && month < cur.month);
}

