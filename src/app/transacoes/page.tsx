import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ArrowLeftRight } from 'lucide-react';

export default async function TransacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Transações</h1>
          <p className="text-sm text-zinc-400">
            Histórico e lançamentos de receitas, despesas e compras no cartão.
          </p>
        </div>

        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
          <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-40 text-emerald-400" />
          <h3 className="text-base font-semibold text-zinc-200">Módulo de Transações</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Em breve: Lançamentos rápidos, categorização automática e divisão de compras parceladas.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
