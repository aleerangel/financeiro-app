import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCategories } from '@/lib/actions/categories';
import { CategoriesList } from '@/components/categories/CategoriesList';

export const instant = false;

export default async function CategoriasPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Categorias</h1>
          <p className="text-sm text-zinc-400">
            Organize suas despesas e receitas personalizando nomes, cores e ícones.
          </p>
        </div>

        <CategoriesList initialCategories={categories} />
      </div>
    </AppShell>
  );
}

