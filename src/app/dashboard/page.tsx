import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { getCategories } from '@/lib/actions/categories';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function DashboardPage() {
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
      <DashboardView
        initialAccounts={accounts}
        initialCards={cards}
        categories={categories}
      />
    </AppShell>
  );
}
