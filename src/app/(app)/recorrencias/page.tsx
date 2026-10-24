import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getRecurrences } from '@/lib/actions/recurrences';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { RecurrencesList } from '@/components/recurrences/RecurrencesList';

export default async function RecorrenciasPage() {
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
    <div className="space-y-6">
      <PageHeader
        title="Contas Fixas & Recorrências"
        description="Configure suas receitas e despesas que se repetem todo mês e gere lançamentos automáticos no vencimento."
      />

      <RecurrencesList
        initialRecurrences={recurrences}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />
    </div>
  );
}

