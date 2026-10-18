'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="w-full max-w-sm p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl text-center space-y-5">
        <h1 className="text-xl font-bold tracking-tight">Finanças Pessoais</h1>
        <p className="text-sm text-zinc-400">Aceda com a sua conta Google autorizada</p>
        <button
          onClick={handleLogin}
          className="w-full py-2.5 px-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition font-semibold rounded-lg text-sm"
        >
          Entrar com Google
        </button>
      </div>
    </main>
  );
}
