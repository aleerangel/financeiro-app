import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { AppShell } from '@/components/layout/AppShell';
import { CreditCardsList } from '@/components/cards/CreditCardsList';

export const instant = false;

export default async function CartoesPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const cards = await getCreditCards();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Cartões de Crédito</h1>
          <p className="text-sm text-zinc-400">
            Acompanhe limites, datas de fechamento e vencimento de suas faturas.
          </p>
        </div>

        <CreditCardsList initialCards={cards} />
      </div>
    </AppShell>
  );
}

