import { describe, it, expect } from 'vitest';
import { buildCalendarWeeks, findDefaultWeekIndex } from './week-utils';

describe('buildCalendarWeeks', () => {
  it('outubro/2026: semanas Dom–Sáb cobrindo o mês inteiro', () => {
    const weeks = buildCalendarWeeks(2026, 9);
    // 01/10/2026 é quinta-feira -> primeira semana começa em 27/09 (domingo)
    expect(weeks[0].startDate).toBe('2026-09-27');
    expect(weeks[0].endDate).toBe('2026-10-03');
    expect(weeks[0].shortLabel).toBe('27/09 - 03/10');
    expect(weeks[weeks.length - 1].endDate >= '2026-10-31').toBe(true);
  });

  it('toda semana tem 7 dias começando no domingo e terminando no sábado', () => {
    for (const w of buildCalendarWeeks(2026, 1)) {
      expect(w.days).toHaveLength(7);
      expect(w.days[0].weekdayLabel).toBe('Dom');
      expect(w.days[6].weekdayLabel).toBe('Sáb');
      expect(w.days[0].dateStr).toBe(w.startDate);
      expect(w.days[6].dateStr).toBe(w.endDate);
    }
  });

  it('mês começando no domingo não gera semana anterior vazia', () => {
    // 01/02/2026 é domingo
    const weeks = buildCalendarWeeks(2026, 1);
    expect(weeks[0].startDate).toBe('2026-02-01');
    expect(weeks).toHaveLength(4);
  });

  it('semanas são contíguas e indexadas', () => {
    const weeks = buildCalendarWeeks(2026, 11);
    weeks.forEach((w, i) => expect(w.index).toBe(i));
  });
});

describe('findDefaultWeekIndex', () => {
  const weeks = buildCalendarWeeks(2026, 9);

  it('acha a semana que contém hoje', () => {
    expect(findDefaultWeekIndex(weeks, new Date('2026-10-19T15:00:00Z'))).toBe(3);
  });

  it('cai em 0 quando hoje não está no mês', () => {
    expect(findDefaultWeekIndex(weeks, new Date('2027-05-10T15:00:00Z'))).toBe(0);
  });
});
