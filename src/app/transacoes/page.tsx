import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
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

  // Garante que recorrências ativas do mês já existam antes da leitura
  await syncMonthlyRecurrences(month, year);

  const [accounts, cards, categories, transactions] = await Promise.all([
    getAccounts(),
    getCreditCards(),
    getCategories(),
    getTransactions(month, year),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Transações</h1>
          <p className="text-sm text-zinc-400">
            Acompanhe receitas, despesas à vista e faturas de cartão de crédito.
          </p>
        </div>

        <TransactionsView
          initialAccounts={accounts}
          initialCards={cards}
          initialCategories={categories}
          initialTransactions={transactions}
          initialMonth={month}
          initialYear={year}
        />
      </div>
    </AppShell>
  );
}
