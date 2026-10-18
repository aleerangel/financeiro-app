import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getProducts } from '@/lib/actions/products';
import { ProductsList } from '@/components/products/ProductsList';

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const products = await getProducts(true);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Serviços & Produtos
          </h1>
          <p className="text-sm text-zinc-400">
            Gerencie o catálogo de serviços da barbearia (Corte, Barba, etc.) e produtos com seus preços de tabela.
          </p>
        </div>

        <ProductsList initialProducts={products} />
      </div>
    </AppShell>
  );
}

