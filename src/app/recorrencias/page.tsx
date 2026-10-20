import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getRecurrences } from '@/lib/actions/recurrences';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { RecurrencesList } from '@/components/recurrences/RecurrencesList';

export const instant = false;

export default async function RecorrenciasPage() {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const [recurrences, accounts, cards, categories] = await Promise.all([
    getRecurrences(),
    getAccounts(),
    getCreditCards(),
    getCategories(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Contas Fixas & Recorrências</h1>
          <p className="text-sm text-zinc-400">
            Configure suas receitas e despesas que se repetem todo mês e gere lançamentos automáticos.
          </p>
        </div>

        <RecurrencesList
          initialRecurrences={recurrences}
          accounts={accounts}
          cards={cards}
          categories={categories}
        />
      </div>
    </AppShell>
  );
}

