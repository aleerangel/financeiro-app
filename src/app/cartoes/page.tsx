import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreditCardsList } from '@/components/cards/CreditCardsList';

export default async function CartoesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const cards = await getCreditCards();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <PageHeader
          title="Cartões de Crédito"
          description="Acompanhe limites, datas de fechamento e vencimento de suas faturas."
        />

        <CreditCardsList initialCards={cards} />
      </div>
    </AppShell>
  );
}

