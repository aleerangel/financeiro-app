import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const handleLogout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Painel Financeiro</h1>
          <p className="text-sm text-zinc-400">Sessão iniciada como: {user.email}</p>
        </div>
        <form action={handleLogout}>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
          >
            Terminar sessão
          </button>
        </form>
      </div>

      <div className="max-w-4xl mx-auto mt-8">
        <p className="text-zinc-400">Autenticação configurada com sucesso!</p>
      </div>
    </main>
  );
}
