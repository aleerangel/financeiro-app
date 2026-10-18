import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { getCreditCards } from '@/lib/actions/credit-cards';
import { AppShell } from '@/components/layout/AppShell';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Plus, ChevronRight, Landmark } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [accounts, cards] = await Promise.all([
    getAccounts(),
    getCreditCards(),
  ]);

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.current_balance, 0);
  const totalCardUsed = cards.reduce((acc, curr) => acc + curr.used_limit, 0);
  const totalCardLimit = cards.reduce((acc, curr) => acc + Number(curr.credit_limit), 0);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        {/* Boas-vindas e Ações Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Visão Geral</h1>
            <p className="text-sm text-zinc-400">Resumo financeiro do seu mês</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/transacoes"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nova Transação
            </Link>
          </div>
        </div>

        {/* Cards de Resumo Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Saldo em Contas */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Saldo Total em Contas</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">{formatCurrency(totalBalance)}</h2>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                {accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
              </span>
            </div>
          </div>

          {/* Card Faturas de Cartão */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Faturas / Limite Usado</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-300">{formatCurrency(totalCardUsed)}</h2>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                de {formatCurrency(totalCardLimit)} limite total
              </span>
            </div>
          </div>

          {/* Card Receitas do Mês */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Receitas</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(0)}</h2>
              <span className="text-[11px] text-zinc-500 mt-1 block">Previsto para o mês</span>
            </div>
          </div>

          {/* Card Despesas do Mês */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Despesas</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-rose-400">{formatCurrency(0)}</h2>
              <span className="text-[11px] text-zinc-500 mt-1 block">Pagas e pendentes</span>
            </div>
          </div>
        </div>

        {/* Seção Central: Minhas Contas e Meus Cartões */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Minhas Contas */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-400" />
                Minhas Contas
              </h3>
              <Link href="/contas" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {accounts.map((acc) => (
                <div key={acc.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    />
                    <span className="text-sm font-medium text-zinc-200">{acc.name}</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-100">
                    {formatCurrency(acc.current_balance)}
                  </span>
                </div>
              ))}

              {accounts.length === 0 && (
                <p className="py-6 text-center text-xs text-zinc-500">
                  Nenhuma conta cadastrada ainda.
                </p>
              )}
            </div>
          </div>

          {/* Meus Cartões */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Meus Cartões
              </h3>
              <Link href="/cartoes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {cards.map((card) => (
                <div key={card.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: card.color || '#8b5cf6' }}
                    />
                    <div>
                      <span className="text-sm font-medium text-zinc-200 block">{card.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        Vence dia {card.due_day}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-300 block">
                      {formatCurrency(card.used_limit)}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Disp: {formatCurrency(card.available_limit)}
                    </span>
                  </div>
                </div>
              ))}

              {cards.length === 0 && (
                <p className="py-6 text-center text-xs text-zinc-500">
                  Nenhum cartão cadastrado ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
