'use server';

import { getTransactions } from './transactions';
import { getSales } from './sales';
import { getBusinessProfile } from './business-profile';
import { buildMonthlyWrappedData, MonthlyWrappedData } from '@/lib/monthly-wrapped-utils';

export async function getMonthlyWrappedData(
  month: number,
  year: number
): Promise<MonthlyWrappedData | null> {
  try {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    const [currentTransactions, previousTransactions, profile] = await Promise.all([
      getTransactions(month, year),
      getTransactions(prevMonth, prevYear),
      getBusinessProfile(),
    ]);

    const hasBusiness = Boolean(profile?.has_business);
    const businessName = profile?.business_name || 'Negócio';

    let currentSales = undefined;
    let previousSales = undefined;

    if (hasBusiness) {
      const [currSales, prevSales] = await Promise.all([
        getSales(month, year),
        getSales(prevMonth, prevYear),
      ]);
      currentSales = currSales;
      previousSales = prevSales;
    }

    return buildMonthlyWrappedData({
      month,
      year,
      currentTransactions,
      previousTransactions,
      hasBusiness,
      businessName,
      currentSales,
      previousSales,
    });
  } catch (error) {
    console.error('Erro ao buscar dados da retrospectiva mensal:', error);
    return null;
  }
}
