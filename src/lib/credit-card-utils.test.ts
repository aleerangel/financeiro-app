import { describe, it, expect } from 'vitest';
import { calculateInstallmentDueDates, getCardInvoiceStatus } from './credit-card-utils';

describe('credit-card-utils - calculateInstallmentDueDates', () => {
  it('places purchase on current invoice when transaction is on or before closing day (dueDay > closingDay)', () => {
    // Cartão fecha dia 10 e vence dia 20
    const dates = calculateInstallmentDueDates('2026-10-08', 10, 20, 1);
    expect(dates).toEqual(['2026-10-20']);
  });

  it('places purchase on next invoice when transaction is after closing day', () => {
    // Cartão fecha dia 10 e vence dia 20; compra feita dia 12/10 vai para 20/11
    const dates = calculateInstallmentDueDates('2026-10-12', 10, 20, 1);
    expect(dates).toEqual(['2026-11-20']);
  });

  it('rolls due date to following month when dueDay < closingDay (e.g. closes 25, due 05)', () => {
    // Compra antes do fechamento (20/10): fecha em 25/10 e vence em 05/11
    expect(calculateInstallmentDueDates('2026-10-20', 25, 5, 1)).toEqual([
      '2026-11-05',
    ]);

    // Compra após o fechamento (27/10): fecha em 25/11 e vence em 05/12
    expect(calculateInstallmentDueDates('2026-10-27', 25, 5, 1)).toEqual([
      '2026-12-05',
    ]);
  });

  it('generates consecutive monthly installment dates across year boundaries and clamps day 31 in short months', () => {
    const dates = calculateInstallmentDueDates('2026-12-02', 10, 31, 4);
    expect(dates).toEqual([
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
  });
});

describe('credit-card-utils - getCardInvoiceStatus', () => {
  it('identifies open invoice and counts days left when today is before closing day', () => {
    // Hoje é dia 08/10/2026, fecha dia 14 e vence dia 21
    const fixedNow = new Date('2026-10-08T15:00:00Z');
    const status = getCardInvoiceStatus({ closing_day: 14, due_day: 21 }, 9, 2026, fixedNow);

    expect(status.isOpen).toBe(true);
    expect(status.statusLabel).toBe('Fatura Aberta');
    expect(status.closingLabel).toBe('Fecha dia 14');
    expect(status.daysLeftLabel).toBe('Faltam 6 dias');
    expect(status.dueLabel).toBe('Vence dia 21');
  });

  it('shows "Fecha hoje" when today is the closing day', () => {
    const fixedNow = new Date('2026-10-14T15:00:00Z');
    const status = getCardInvoiceStatus({ closing_day: 14, due_day: 21 }, 9, 2026, fixedNow);

    expect(status.isOpen).toBe(true);
    expect(status.closingLabel).toBe('Fecha dia 14');
    expect(status.daysLeftLabel).toBe('Fecha hoje');
  });

  it('shows "Falta 1 dia" when today is 1 day before closing day', () => {
    const fixedNow = new Date('2026-10-13T15:00:00Z');
    const status = getCardInvoiceStatus({ closing_day: 14, due_day: 21 }, 9, 2026, fixedNow);

    expect(status.isOpen).toBe(true);
    expect(status.daysLeftLabel).toBe('Falta 1 dia');
  });

  it('identifies closed invoice and shows due day when today is after closing day', () => {
    // Hoje é dia 15/10/2026, fechou dia 14 e vence dia 21
    const fixedNow = new Date('2026-10-15T15:00:00Z');
    const status = getCardInvoiceStatus({ closing_day: 14, due_day: 21 }, 9, 2026, fixedNow);

    expect(status.isOpen).toBe(false);
    expect(status.statusLabel).toBe('Fatura Fechada');
    expect(status.dueLabel).toBe('Vence dia 21');
    expect(status.daysLeftLabel).toBeUndefined();
  });

  it('advances to next open invoice when previous invoice has closed and was paid (user case: 23/10, closes 14, due 21)', () => {
    // Hoje é dia 23/10/2026. Fatura fechou 14/10, venceu 21/10 e foi paga
    const fixedNow = new Date('2026-10-23T15:00:00Z');
    const status = getCardInvoiceStatus(
      { closing_day: 14, due_day: 21 },
      undefined,
      undefined,
      fixedNow,
      { hasPendingClosedInvoice: false }
    );

    expect(status.isOpen).toBe(true);
    expect(status.statusLabel).toBe('Fatura Aberta');
    expect(status.closingLabel).toBe('Fecha dia 14');
    expect(status.daysLeftLabel).toBe('Faltam 22 dias');
    expect(status.dueLabel).toBe('Vence dia 21');
    expect(status.closingDateStr).toBe('2026-11-14');
    expect(status.dueDateStr).toBe('2026-11-21');
  });

  it('advances to next open invoice automatically when today is past due date and no pending invoice specified', () => {
    // Hoje é dia 23/10/2026 (> vencimento 21/10)
    const fixedNow = new Date('2026-10-23T15:00:00Z');
    const status = getCardInvoiceStatus(
      { closing_day: 14, due_day: 21 },
      undefined,
      undefined,
      fixedNow
    );

    expect(status.isOpen).toBe(true);
    expect(status.statusLabel).toBe('Fatura Aberta');
    expect(status.closingLabel).toBe('Fecha dia 14');
    expect(status.daysLeftLabel).toBe('Faltam 22 dias');
    expect(status.closingDateStr).toBe('2026-11-14');
    expect(status.dueDateStr).toBe('2026-11-21');
  });

  it('keeps closed invoice status when closed invoice still has pending balance after due date', () => {
    // Hoje é dia 23/10/2026, mas fatura de outubro NÃO foi paga (atrasada)
    const fixedNow = new Date('2026-10-23T15:00:00Z');
    const status = getCardInvoiceStatus(
      { closing_day: 14, due_day: 21 },
      undefined,
      undefined,
      fixedNow,
      { hasPendingClosedInvoice: true }
    );

    expect(status.isOpen).toBe(false);
    expect(status.statusLabel).toBe('Fatura Fechada');
    expect(status.dueLabel).toBe('Venceu dia 21');
    expect(status.closingDateStr).toBe('2026-10-14');
    expect(status.dueDateStr).toBe('2026-10-21');
  });

  it('keeps closed invoice status when today is between closing date and due date and pending is true', () => {
    // Hoje é dia 18/10/2026 (entre 14/10 e 21/10)
    const fixedNow = new Date('2026-10-18T15:00:00Z');
    const status = getCardInvoiceStatus(
      { closing_day: 14, due_day: 21 },
      undefined,
      undefined,
      fixedNow,
      { hasPendingClosedInvoice: true }
    );

    expect(status.isOpen).toBe(false);
    expect(status.statusLabel).toBe('Fatura Fechada');
    expect(status.dueLabel).toBe('Vence dia 21');
  });

  it('advances to next open invoice if paid early between closing date and due date', () => {
    // Hoje é dia 18/10/2026, fechou 14/10 e o usuário já pagou adiantado
    const fixedNow = new Date('2026-10-18T15:00:00Z');
    const status = getCardInvoiceStatus(
      { closing_day: 14, due_day: 21 },
      undefined,
      undefined,
      fixedNow,
      { hasPendingClosedInvoice: false }
    );

    expect(status.isOpen).toBe(true);
    expect(status.statusLabel).toBe('Fatura Aberta');
    expect(status.closingLabel).toBe('Fecha dia 14');
    expect(status.daysLeftLabel).toBe('Faltam 27 dias');
    expect(status.closingDateStr).toBe('2026-11-14');
  });

  it('handles cross-month due dates correctly (e.g. closes 25 of month - 1, due 05)', () => {
    // Vencimento em 05/11/2026, fecha em 25/10/2026. Hoje é 20/10/2026
    const fixedNow = new Date('2026-10-20T15:00:00Z');
    const status = getCardInvoiceStatus({ closing_day: 25, due_day: 5 }, 10, 2026, fixedNow);

    expect(status.isOpen).toBe(true);
    expect(status.closingLabel).toBe('Fecha dia 25');
    expect(status.daysLeftLabel).toBe('Faltam 5 dias');
    expect(status.dueLabel).toBe('Vence dia 5');
  });
});

