import { getZonedParts, getTodayYMD } from './date-utils';

/**
 * Calcula a data de vencimento da fatura para uma compra de cartão de crédito
 * considerando dia de fechamento (melhor dia) e dia de vencimento.
 */
export function calculateInstallmentDueDates(
  transactionDateStr: string,
  closingDay: number,
  dueDay: number,
  totalInstallments: number = 1
): string[] {
  const pDate = new Date(transactionDateStr + 'T12:00:00');
  const pYear = pDate.getFullYear();
  const pMonth = pDate.getMonth(); // 0 a 11
  const pDay = pDate.getDate();

  // Mês e ano do fechamento da fatura
  let invoiceClosingYear = pYear;
  let invoiceClosingMonth = pMonth;

  if (pDay > closingDay) {
    // Se a compra foi feita após o fechamento, cai na fatura do mês seguinte
    invoiceClosingMonth += 1;
    if (invoiceClosingMonth > 11) {
      invoiceClosingMonth = 0;
      invoiceClosingYear += 1;
    }
  }

  // Mês e ano do vencimento da fatura
  let invoiceDueYear = invoiceClosingYear;
  let invoiceDueMonth = invoiceClosingMonth;

  if (dueDay < closingDay) {
    // Ex: fecha dia 25 e vence dia 05 do mês seguinte
    invoiceDueMonth += 1;
    if (invoiceDueMonth > 11) {
      invoiceDueMonth = 0;
      invoiceDueYear += 1;
    }
  }

  const dueDates: string[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    let instMonth = invoiceDueMonth + i;
    let instYear = invoiceDueYear;

    while (instMonth > 11) {
      instMonth -= 12;
      instYear += 1;
    }

    // Ajuste para meses com menos dias (ex: dia 31 em fevereiro ou abril)
    const daysInMonth = new Date(instYear, instMonth + 1, 0).getDate();
    const finalDay = Math.min(dueDay, daysInMonth);

    const formattedMonth = String(instMonth + 1).padStart(2, '0');
    const formattedDay = String(finalDay).padStart(2, '0');
    dueDates.push(`${instYear}-${formattedMonth}-${formattedDay}`);
  }

  return dueDates;
}

export interface CardInvoiceStatus {
  isOpen: boolean;
  statusLabel: 'Fatura Aberta' | 'Fatura Fechada';
  closingLabel: string; // Ex: "Fecha dia 14"
  daysLeftLabel?: string; // Ex: "Faltam 5 dias", "Falta 1 dia", "Fecha hoje"
  dueLabel: string; // Ex: "Vence dia 21"
  diffDays?: number;
  closingDateStr: string;
  dueDateStr: string;
}

/**
 * Calcula o status de fatura aberta ou fechada para um cartão no mês de referência.
 *
 * - Se aberta: "Fecha dia {dia}" e "Faltam {x} dias" (ou "Fecha hoje", "Falta 1 dia")
 * - Se fechada: "Vence dia {dueDay}"
 */
export function getCardInvoiceStatus(
  card: { closing_day: number; due_day: number },
  referenceMonth?: number,
  referenceYear?: number,
  now: Date = new Date()
): CardInvoiceStatus {
  const { month: defaultM, year: defaultY } = getZonedParts(now);
  const targetM = referenceMonth !== undefined ? referenceMonth : defaultM;
  const targetY = referenceYear !== undefined ? referenceYear : defaultY;
  const todayStr = getTodayYMD(now);

  const daysInDueMonth = new Date(targetY, targetM + 1, 0).getDate();
  const finalDueDay = Math.min(card.due_day, daysInDueMonth);
  const dueDateStr = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(finalDueDay).padStart(2, '0')}`;

  let closingMonth = targetM;
  let closingYear = targetY;
  if (card.due_day < card.closing_day) {
    closingMonth -= 1;
    if (closingMonth < 0) {
      closingMonth = 11;
      closingYear -= 1;
    }
  }

  const daysInClosingMonth = new Date(closingYear, closingMonth + 1, 0).getDate();
  const finalClosingDay = Math.min(card.closing_day, daysInClosingMonth);
  const closingDateStr = `${closingYear}-${String(closingMonth + 1).padStart(2, '0')}-${String(finalClosingDay).padStart(2, '0')}`;

  // Se hoje for menor ou igual ao fechamento, a fatura ainda está aberta para lançamentos
  const isOpen = todayStr <= closingDateStr;

  if (isOpen) {
    const todayDate = new Date(todayStr + 'T12:00:00');
    const closingDate = new Date(closingDateStr + 'T12:00:00');
    const diffTime = closingDate.getTime() - todayDate.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

    let daysLeftLabel = `Faltam ${diffDays} dias`;
    if (diffDays === 0) {
      daysLeftLabel = 'Fecha hoje';
    } else if (diffDays === 1) {
      daysLeftLabel = 'Falta 1 dia';
    }

    return {
      isOpen: true,
      statusLabel: 'Fatura Aberta',
      closingLabel: `Fecha dia ${finalClosingDay}`,
      daysLeftLabel,
      dueLabel: `Vence dia ${finalDueDay}`,
      diffDays,
      closingDateStr,
      dueDateStr,
    };
  }

  return {
    isOpen: false,
    statusLabel: 'Fatura Fechada',
    closingLabel: `Fechou dia ${finalClosingDay}`,
    daysLeftLabel: undefined,
    dueLabel: `Vence dia ${finalDueDay}`,
    diffDays: 0,
    closingDateStr,
    dueDateStr,
  };
}


