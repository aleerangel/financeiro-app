import { describe, it, expect } from 'vitest';
import { NotificationCategory } from '@/types/notifications';
import { addDaysToYMD, formatDateBR } from '@/lib/date-utils';

describe('Notificações - Regras, Antecedência e Idempotência', () => {
  it('gera chave de idempotência diária consistente', () => {
    const buildIdempotencyKey = (
      category: NotificationCategory,
      entityId: string,
      dateYMD: string
    ) => `${category}:${entityId}:${dateYMD}`;

    const key1 = buildIdempotencyKey('bill_due', 'tx-123', '2026-10-24');
    const key2 = buildIdempotencyKey('bill_due', 'tx-123', '2026-10-24');
    const keyDiffDay = buildIdempotencyKey('bill_due', 'tx-123', '2026-10-25');

    expect(key1).toBe('bill_due:tx-123:2026-10-24');
    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDiffDay);
  });

  it('calcula datas alvo de antecedência com consistência de calendário', () => {
    expect(addDaysToYMD('2026-11-03', 0)).toBe('2026-11-03');
    expect(addDaysToYMD('2026-11-03', 1)).toBe('2026-11-04');
    expect(addDaysToYMD('2026-11-03', 3)).toBe('2026-11-06');
    expect(addDaysToYMD('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToYMD('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('formata data BR no padrão DD/MM/YYYY', () => {
    expect(formatDateBR('2026-11-03')).toBe('03/11/2026');
    expect(formatDateBR('2026-05-15')).toBe('15/05/2026');
  });

  it('gera rótulos de antecedência corretos (no dia, amanhã e em N dias)', () => {
    const getNotificationLabel = (daysBefore: number, dueDate: string) => {
      if (daysBefore === 0) return { title: 'Conta Vence Hoje' };
      if (daysBefore === 1) return { title: 'Conta Vence Amanhã' };
      return { title: 'Conta a Vencer', messagePart: `vence em ${daysBefore} dias (${formatDateBR(dueDate)})` };
    };

    expect(getNotificationLabel(0, '2026-11-03').title).toBe('Conta Vence Hoje');
    expect(getNotificationLabel(1, '2026-11-04').title).toBe('Conta Vence Amanhã');
    const label3 = getNotificationLabel(3, '2026-11-06');
    expect(label3.title).toBe('Conta a Vencer');
    expect(label3.messagePart).toContain('vence em 3 dias (06/11/2026)');
  });

  it('gera chave de idempotência com antecedência sem colidir com alertas de outros dias', () => {
    const buildAdvanceKey = (billId: string, targetDate: string, daysBefore: number) =>
      `bill_due:${billId}:${targetDate}:day_${daysBefore}`;

    const keyDay0 = buildAdvanceKey('tx-1', '2026-11-06', 0);
    const keyDay1 = buildAdvanceKey('tx-1', '2026-11-06', 1);
    const keyDay3 = buildAdvanceKey('tx-1', '2026-11-06', 3);

    expect(keyDay0).toBe('bill_due:tx-1:2026-11-06:day_0');
    expect(keyDay1).toBe('bill_due:tx-1:2026-11-06:day_1');
    expect(keyDay3).toBe('bill_due:tx-1:2026-11-06:day_3');

    expect(keyDay3).not.toBe(keyDay1);
    expect(keyDay3).not.toBe(keyDay0);
  });

  it('classifica corretamente entre conta vencendo hoje e conta em atraso', () => {
    const classifyBill = (dueDate: string, today: string) => {
      if (dueDate < today) return 'bill_overdue';
      if (dueDate === today) return 'bill_due';
      return 'future';
    };

    expect(classifyBill('2026-10-24', '2026-10-24')).toBe('bill_due');
    expect(classifyBill('2026-10-23', '2026-10-24')).toBe('bill_overdue');
    expect(classifyBill('2026-10-25', '2026-10-24')).toBe('future');
  });

  it('detecta se um cliente é aniversariante do dia ignorando o ano de nascimento', () => {
    const isBirthdayToday = (birthDate: string, todayYMD: string) => {
      const [, m1, d1] = birthDate.split('-');
      const [, m2, d2] = todayYMD.split('-');
      return m1 === m2 && d1 === d2;
    };

    expect(isBirthdayToday('1990-10-24', '2026-10-24')).toBe(true);
    expect(isBirthdayToday('1995-10-24', '2026-10-24')).toBe(true);
    expect(isBirthdayToday('1990-10-25', '2026-10-24')).toBe(false);
    expect(isBirthdayToday('1990-11-24', '2026-10-24')).toBe(false);
  });
});
