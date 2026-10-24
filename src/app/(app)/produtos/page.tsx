import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProducts } from '@/lib/actions/products';
import { ProductsList } from '@/components/products/ProductsList';

export default async function ProdutosPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const products = await getProducts(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços & Produtos"
        description="Gerencie o catálogo de serviços da barbearia (Corte, Barba, etc.) e produtos de balcão com estoque."
      />

      <ProductsList initialProducts={products} />
    </div>
  );
}

