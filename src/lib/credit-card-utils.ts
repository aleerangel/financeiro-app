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

