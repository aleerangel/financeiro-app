import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { getTransactions } from '@/lib/actions/transactions';
import { syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { getZonedParts } from '@/lib/date-utils';
import { TransactionsView } from '@/components/transactions/TransactionsView';

export const instant = false;

export default async function TransacoesPage() {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const { month, year } = getZonedParts();

  const [accounts, cards, categories, transactions] = await Promise.all([
    getAccounts(),
    getCreditCards(),
    getCategories(),
    getTransactions(month, year),
    syncMonthlyRecurrences(month, year).catch(() => {}),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações & Extrato"
        description={<span className="hidden sm:inline">Acompanhe receitas, despesas à vista e faturas de cartão de crédito.</span>}
        className="mb-2 sm:mb-6"
      />

      <TransactionsView
        initialAccounts={accounts}
        initialCards={cards}
        initialCategories={categories}
        initialTransactions={transactions}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  );
}
