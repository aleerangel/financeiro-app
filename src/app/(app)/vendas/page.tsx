import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
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
    <div className="space-y-6">
      <PageHeader
        title="Atendimentos & Vendas"
        description="Registre os clientes atendidos, serviços prestados e receba os valores diretamente no seu caixa."
      />

      <SalesView
        initialSales={sales}
        products={products}
        accounts={accounts}
        clients={clients}
        initialClientId={initialClientId}
      />
    </div>
  );
}

