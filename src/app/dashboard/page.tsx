import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { getBusinessDashboardData, getGeneralDashboardData } from '@/lib/actions/dashboard';
import { getUpcomingAndOverdueBills, getPendingIncomeReceipts } from '@/lib/actions/transactions';
import { syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { getZonedParts } from '@/lib/date-utils';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const instant = false;

export default async function DashboardPage() {
  await connection();

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const { year: currentYear, month: currentMonth } = getZonedParts();
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  // Gera as contas fixas do mês atual (e do próximo, para alertas de vencimento
  // na virada do mês) em paralelo no servidor, antes de consultar os dados.
  await Promise.all([
    syncMonthlyRecurrences(currentMonth, currentYear),
    syncMonthlyRecurrences(nextMonth, nextYear),
  ]);

  const [accounts, cards, categories, businessData, generalData, upcomingBills, pendingReceipts] = await Promise.all([
    getAccounts(),
    getCreditCards(),
    getCategories(),
    getBusinessDashboardData(currentYear, currentMonth),
    getGeneralDashboardData(currentYear, currentMonth),
    getUpcomingAndOverdueBills(3),
    getPendingIncomeReceipts(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <DashboardView
        initialAccounts={accounts}
        initialCards={cards}
        categories={categories}
        initialBusinessData={businessData}
        initialGeneralData={generalData}
        initialUpcomingBills={upcomingBills}
        initialPendingReceipts={pendingReceipts}
      />
    </AppShell>
  );
}
