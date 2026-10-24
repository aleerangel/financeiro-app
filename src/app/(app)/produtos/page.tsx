import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProducts } from '@/lib/actions/products';
import { getBusinessProfile } from '@/lib/actions/business-profile';
import { ProductsList } from '@/components/products/ProductsList';
import { BusinessRequiredView } from '@/components/layout/BusinessRequiredView';

export default async function ProdutosPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getBusinessProfile();
  if (!profile.has_business) {
    return (
      <BusinessRequiredView
        moduleName="Serviços & Catálogo de Produtos"
        description="Cadastre os serviços prestados, valores padrão e produtos para agilizar os lançamentos do seu negócio."
      />
    );
  }

  const products = await getProducts(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços & Catálogo"
        description="Cadastre seu catálogo de serviços, mão de obra e produtos para agilizar o registro de atendimentos."
      />

      <ProductsList initialProducts={products} />
    </div>
  );
}

