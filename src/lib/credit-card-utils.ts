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
  closingLabel: string; // Ex: "Fecha dia 14" ou "Fechou dia 14"
  daysLeftLabel?: string; // Ex: "Faltam 5 dias", "Falta 1 dia", "Fecha hoje"
  dueLabel: string; // Ex: "Vence dia 21" ou "Venceu dia 21"
  diffDays?: number;
  closingDateStr: string;
  dueDateStr: string;
}

export interface CardInvoiceStatusOptions {
  /**
   * Indica se a fatura fechada do ciclo anterior ainda possui saldo pendente a pagar.
   * - true: força manter o status da fatura fechada (aguardando pagamento).
   * - false: indica que a fatura anterior já foi paga, avançando para a fatura aberta do próximo ciclo.
   * - undefined: se hoje já passou da data de vencimento da fatura fechada, avança para a próxima fatura aberta. Se estiver entre o fechamento e o vencimento, mantém como fechada.
   */
  hasPendingClosedInvoice?: boolean;
}

export interface CardCycleInfo {
  openDueDateStr: string;
  openClosingDateStr: string;
  prevDueDateStr: string;
  prevClosingDateStr: string;
}

/**
 * Obtém as datas de fechamento e vencimento do ciclo da fatura aberta atual
 * e do ciclo da fatura anterior que acabou de fechar.
 */
export function getCardCycleInfo(
  card: { closing_day: number; due_day: number },
  now: Date = new Date()
): CardCycleInfo {
  const todayStr = getTodayYMD(now);
  const openDueDateStr = calculateInstallmentDueDates(todayStr, card.closing_day, card.due_day, 1)[0];
  const [openDueY, openDueM] = openDueDateStr.split('-').map(Number);

  // Mês e ano do fechamento da fatura aberta
  let openClosingYear = openDueY;
  let openClosingMonth = openDueM - 1; // 0-indexed (0 a 11)

  if (card.due_day < card.closing_day) {
    openClosingMonth -= 1;
    if (openClosingMonth < 0) {
      openClosingMonth = 11;
      openClosingYear -= 1;
    }
  }

  const daysInOpenClosing = new Date(openClosingYear, openClosingMonth + 1, 0).getDate();
  const finalOpenClosingDay = Math.min(card.closing_day, daysInOpenClosing);
  const openClosingDateStr = `${openClosingYear}-${String(openClosingMonth + 1).padStart(2, '0')}-${String(finalOpenClosingDay).padStart(2, '0')}`;

  // Ciclo anterior (fatura que acabou de fechar)
  let prevDueYear = openDueY;
  let prevDueMonth = openDueM - 2; // 0-indexed
  if (prevDueMonth < 0) {
    prevDueMonth = 11;
    prevDueYear -= 1;
  }
  const daysInPrevDue = new Date(prevDueYear, prevDueMonth + 1, 0).getDate();
  const finalPrevDueDay = Math.min(card.due_day, daysInPrevDue);
  const prevDueDateStr = `${prevDueYear}-${String(prevDueMonth + 1).padStart(2, '0')}-${String(finalPrevDueDay).padStart(2, '0')}`;

  let prevClosingYear = openClosingYear;
  let prevClosingMonth = openClosingMonth - 1;
  if (prevClosingMonth < 0) {
    prevClosingMonth = 11;
    prevClosingYear -= 1;
  }
  const daysInPrevClosing = new Date(prevClosingYear, prevClosingMonth + 1, 0).getDate();
  const finalPrevClosingDay = Math.min(card.closing_day, daysInPrevClosing);
  const prevClosingDateStr = `${prevClosingYear}-${String(prevClosingMonth + 1).padStart(2, '0')}-${String(finalPrevClosingDay).padStart(2, '0')}`;

  return {
    openDueDateStr,
    openClosingDateStr,
    prevDueDateStr,
    prevClosingDateStr,
  };
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
  now: Date = new Date(),
  options?: CardInvoiceStatusOptions
): CardInvoiceStatus {
  const { month: defaultM, year: defaultY } = getZonedParts(now);
  const todayStr = getTodayYMD(now);

  // Se o mês e ano de referência foram passados e forem diferentes do atual (ex: histórico no resumo),
  // calcula o status específico daquele mês histórico fixo:
  const isHistoricalMonth =
    (referenceMonth !== undefined && referenceMonth !== defaultM) ||
    (referenceYear !== undefined && referenceYear !== defaultY);

  if (isHistoricalMonth) {
    const targetM = referenceMonth !== undefined ? referenceMonth : defaultM;
    const targetY = referenceYear !== undefined ? referenceYear : defaultY;

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

    const isOpen = todayStr <= closingDateStr;
    if (isOpen) {
      const todayDate = new Date(todayStr + 'T12:00:00');
      const closingDate = new Date(closingDateStr + 'T12:00:00');
      const diffTime = closingDate.getTime() - todayDate.getTime();
      const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      let daysLeftLabel = `Faltam ${diffDays} dias`;
      if (diffDays === 0) daysLeftLabel = 'Fecha hoje';
      else if (diffDays === 1) daysLeftLabel = 'Falta 1 dia';

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
      dueLabel: todayStr > dueDateStr ? `Venceu dia ${finalDueDay}` : `Vence dia ${finalDueDay}`,
      diffDays: 0,
      closingDateStr,
      dueDateStr,
    };
  }

  // Ciclo dinâmico ativo no tempo presente:
  const cycle = getCardCycleInfo(card, now);

  // Determina se a fatura fechada do ciclo anterior deve ser exibida como a fatura atual
  let showClosedInvoice = false;
  if (options?.hasPendingClosedInvoice === true) {
    showClosedInvoice = true;
  } else if (options?.hasPendingClosedInvoice === false) {
    showClosedInvoice = false;
  } else {
    // Quando não especificado:
    // Se hoje ainda está entre o fechamento anterior e o vencimento anterior, exibe a fechada
    if (todayStr > cycle.prevClosingDateStr && todayStr <= cycle.prevDueDateStr) {
      showClosedInvoice = true;
    } else {
      showClosedInvoice = false;
    }
  }

  if (showClosedInvoice) {
    const [, , prevClosingD] = cycle.prevClosingDateStr.split('-').map(Number);
    const [, , prevDueD] = cycle.prevDueDateStr.split('-').map(Number);
    return {
      isOpen: false,
      statusLabel: 'Fatura Fechada',
      closingLabel: `Fechou dia ${prevClosingD}`,
      dueLabel: todayStr > cycle.prevDueDateStr ? `Venceu dia ${prevDueD}` : `Vence dia ${prevDueD}`,
      diffDays: 0,
      closingDateStr: cycle.prevClosingDateStr,
      dueDateStr: cycle.prevDueDateStr,
    };
  }

  // Caso contrário, a fatura atual é a Fatura Aberta
  const [, , openClosingD] = cycle.openClosingDateStr.split('-').map(Number);
  const [, , openDueD] = cycle.openDueDateStr.split('-').map(Number);

  const todayDate = new Date(todayStr + 'T12:00:00');
  const closingDate = new Date(cycle.openClosingDateStr + 'T12:00:00');
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
    closingLabel: `Fecha dia ${openClosingD}`,
    daysLeftLabel,
    dueLabel: `Vence dia ${openDueD}`,
    diffDays,
    closingDateStr: cycle.openClosingDateStr,
    dueDateStr: cycle.openDueDateStr,
  };
}


