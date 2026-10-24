import { connection } from 'next/server';
import { headers } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { getBusinessDashboardData, getGeneralDashboardData } from '@/lib/actions/dashboard';
import {
  getUpcomingAndOverdueBills,
  getPendingIncomeReceipts,
  getTransactions,
} from '@/lib/actions/transactions';
import { syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { getZonedParts } from '@/lib/date-utils';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const instant = false;

export default async function DashboardPage() {
  await connection();

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // Detecção de dispositivo no servidor para renderização imediata sem layout shift
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const { year: currentYear, month: currentMonth } = getZonedParts();
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  // Sincronização concorrente de recorrências para não bloquear o TTFB inicial
  const syncCurrentPromise = syncMonthlyRecurrences(currentMonth, currentYear).catch(() => {});
  void syncMonthlyRecurrences(nextMonth, nextYear).catch(() => {});

  // Busca todos os dados do dashboard em paralelo no servidor (incluindo transações iniciais)
  const [
    accounts,
    cards,
    categories,
    businessData,
    generalData,
    upcomingBills,
    pendingReceipts,
    transactions,
  ] = await Promise.all([
    getAccounts(),
    getCreditCards(currentMonth, currentYear),
    getCategories(),
    getBusinessDashboardData(currentYear, currentMonth),
    getGeneralDashboardData(currentYear, currentMonth),
    getUpcomingAndOverdueBills(3),
    getPendingIncomeReceipts(),
    getTransactions(currentMonth, currentYear),
    syncCurrentPromise,
  ]);

  return (
    <DashboardView
      initialAccounts={accounts}
      initialCards={cards}
      categories={categories}
      initialBusinessData={businessData}
      initialGeneralData={generalData}
      initialUpcomingBills={upcomingBills}
      initialPendingReceipts={pendingReceipts}
      initialTransactions={transactions}
      initialIsMobile={isMobile}
    />
  );
}
