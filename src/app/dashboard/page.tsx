import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { year: currentYear, month: currentMonth } = getZonedParts();

  // Gera as contas fixas do mês atual (e do próximo, para alertas de vencimento
  // na virada do mês) uma única vez por carregamento, no servidor.
  await syncMonthlyRecurrences(currentMonth, currentYear);
  await syncMonthlyRecurrences(
    (currentMonth + 1) % 12,
    currentMonth === 11 ? currentYear + 1 : currentYear
  );

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
