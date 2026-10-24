import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCategories } from '@/lib/actions/categories';
import { CategoriesList } from '@/components/categories/CategoriesList';

export default async function CategoriasPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <PageHeader
          title="Categorias"
          description="Organize suas despesas e receitas personalizando nomes, cores, ícones e escopo (pessoal ou barbearia)."
        />

        <CategoriesList initialCategories={categories} />
      </div>
    </AppShell>
  );
}

