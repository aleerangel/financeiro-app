'use client';

import Link from 'next/link';
import { Crown, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ClubMonthlyOverview } from '@/lib/actions/subscriptions';

interface ClubMetricsWidgetProps {
  overview: ClubMonthlyOverview;
  hideIfEmpty?: boolean;
}

export function ClubMetricsWidget({ overview, hideIfEmpty = false }: ClubMetricsWidgetProps) {
  // Se não houver nenhum assinante e nenhuma fatura
  if (overview.activeSubscribersCount === 0 && overview.totalExpected === 0) {
    if (hideIfEmpty) {
      return null;
    }

    return (
      <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Clube de Assinaturas</h3>
              <p className="text-xs text-zinc-400">Mensalidades recorrentes</p>
            </div>
          </div>
          <Link
            href="/mensalidades"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            Ativar Clube
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Crie planos mensais de corte ou barba para fidelizar seus clientes e garantir receita previsível todo mês!
        </p>
      </div>
    );
  }

  const hasOverdue = overview.totalOverdue > 0;

  return (
    <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition relative overflow-hidden flex flex-col justify-between">
      {/* Topo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">Clube de Assinaturas</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {overview.activeSubscribersCount} assinantes
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                MRR Contratado: {formatCurrency(overview.mrr)}
              </p>
            </div>
          </div>

          <Link
            href="/mensalidades"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            Ver Detalhes
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Métricas do Mês */}
        <div className="grid grid-cols-2 gap-2.5 my-3.5">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
            <span className="text-[11px] text-zinc-500 font-medium block">
              Arrecadado no Mês
            </span>
            <span className="text-base font-black text-emerald-400">
              {formatCurrency(overview.totalPaid)}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              {overview.efficiencyRate}% da meta ({overview.paidCount} pagas)
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              hasOverdue
                ? 'bg-rose-950/20 border-rose-500/30'
                : 'bg-zinc-950/80 border-zinc-800/80'
            }`}
          >
            <span className="text-[11px] text-zinc-500 font-medium block">
              {hasOverdue ? 'Em Atraso' : 'A Receber'}
            </span>
            <span
              className={`text-base font-black ${
                hasOverdue ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {formatCurrency(hasOverdue ? overview.totalOverdue : overview.totalPending)}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              {hasOverdue
                ? `${overview.overdueCount} clientes (${overview.overdueRate}% inadimplência)`
                : `${overview.pendingCount} a vencer`}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso de Arrecadação */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
          <span>Progresso de Arrecadação</span>
          <span className="font-bold text-zinc-200">{overview.efficiencyRate}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, overview.efficiencyRate)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
