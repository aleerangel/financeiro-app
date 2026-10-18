import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { TransactionsView } from '@/components/transactions/TransactionsView';

export const instant = false;

export default async function TransacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [accounts, cards, categories] = await Promise.all([
    getAccounts(),
    getCreditCards(),
    getCategories(),
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
        />
      </div>
    </AppShell>
  );
}
