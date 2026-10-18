import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getSales } from '@/lib/actions/sales';
import { getProducts } from '@/lib/actions/products';
import { getAccounts } from '@/lib/actions/accounts';
import { SalesView } from '@/components/sales/SalesView';

export const instant = false;

export default async function VendasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [sales, products, accounts] = await Promise.all([
    getSales(),
    getProducts(false),
    getAccounts(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Atendimentos & Vendas
          </h1>
          <p className="text-sm text-zinc-400">
            Registre os clientes atendidos, serviços prestados e receba os valores diretamente no seu caixa.
          </p>
        </div>

        <SalesView
          initialSales={sales}
          products={products}
          accounts={accounts}
        />
      </div>
    </AppShell>
  );
}

