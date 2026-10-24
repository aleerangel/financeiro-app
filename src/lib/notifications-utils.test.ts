import { describe, it, expect } from 'vitest';
import { NotificationCategory } from '@/types/notifications';

describe('Notificações - Regras e Idempotência', () => {
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

