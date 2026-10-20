import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getSales } from '@/lib/actions/sales';
import { getProducts } from '@/lib/actions/products';
import { getAccounts } from '@/lib/actions/accounts';
import { getClients } from '@/lib/actions/clients';
import { SalesView } from '@/components/sales/SalesView';

export const instant = false;

export default async function VendasPage({
  searchParams,
}: {
  searchParams?: Promise<{ clientId?: string }>;
}) {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const params = searchParams ? await searchParams : undefined;
  const initialClientId = params?.clientId || null;

  const [sales, products, accounts, clients] = await Promise.all([
    getSales(),
    getProducts(false),
    getAccounts(),
    getClients(),
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
          clients={clients}
          initialClientId={initialClientId}
        />
      </div>
    </AppShell>
  );
}

