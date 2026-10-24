'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClientEngagementWhatsAppModal } from '@/components/clients/ClientEngagementWhatsAppModal';
import {
  Scissors,
  TrendingUp,
  Users,
  Wallet,
  ShoppingBag,
  MessageCircle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { BusinessDashboardData } from '@/lib/actions/dashboard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { ClubMetricsWidget } from '@/components/dashboard/ClubMetricsWidget';

export interface BusinessDashboardMobileProps {
  data: BusinessDashboardData;
  accounts: AccountWithBalance[];
  formattedMonth?: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
  onAddBusinessExpense?: () => void;
}

export function BusinessDashboardMobile({
  data,
  formattedMonth,
  loading = false,
}: BusinessDashboardMobileProps) {
  const { showValues } = useMobileNavigation();
  const [engagementClient, setEngagementClient] = useState<{
    id: string;
    name: string;
    phone?: string | null;
    daysSinceLastVisit: number;
  } | null>(null);

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  const summary = data?.monthSummary || {
    revenue: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
    projectedProfit: 0,
    profitMargin: 0,
    salesCount: 0,
    uniqueClientsCount: 0,
    clientReturnRate: 0,
    averageTicket: 0,
  };

  const revenueSplit = data.revenueSplit || {
    serviceRevenue: 0,
    productRevenue: 0,
    servicePercentage: 0,
    productPercentage: 0,
    serviceCount: 0,
    productCount: 0,
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. KPIs Principais: Faturamento, Clientes e Lucro Líquido */}
      <div className="space-y-2.5">
        {/* Card 1: Faturamento */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Faturamento • {formattedMonth || 'Mês Atual'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-400 block tracking-tight">
              {formatHidden(formatCurrency(summary.revenue))}
            </span>
            <span className="text-xs text-zinc-400 mt-1 block">
              Ticket médio: <strong className="text-zinc-200">{formatHidden(formatCurrency(summary.averageTicket))}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Clientes Atendidos */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              Clientes Atendidos
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-blue-400 block tracking-tight">
              {summary.salesCount} {summary.salesCount === 1 ? 'atendimento' : 'atendimentos'}
            </span>
            <span className="text-xs text-zinc-400 mt-1 block">
              {summary.uniqueClientsCount} clientes únicos
              {summary.clientReturnRate > 1 && ` • ${summary.clientReturnRate.toFixed(1)}x visitas`}
            </span>
          </div>
        </div>

        {/* Card 3: Lucro Líquido Real */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Lucro Líquido Real
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-2xl font-extrabold block tracking-tight ${
                  summary.netProfit >= 0 ? 'text-zinc-100' : 'text-rose-400'
                }`}
              >
                {formatHidden(formatCurrency(summary.netProfit))}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                {summary.profitMargin}% margem
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-800/80">
              <span>Gastos pagos: {formatHidden(formatCurrency(summary.paidExpenses))}</span>
              {summary.pendingExpenses > 0 && (
                <span className="text-amber-400/90 font-medium">
                  +{formatHidden(formatCurrency(summary.pendingExpenses))} a pagar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: A Receber (Fiados) */}
        <Link
          href="/fiados"
          className="block p-4 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-2xl transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              A Receber • Fiados em Aberto
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-400 block tracking-tight">
              {formatHidden(formatCurrency(summary.totalReceivables || 0))}
            </span>
            <span className="text-xs text-amber-400/80 font-medium">
              Abrir central &rarr;
            </span>
          </div>
        </Link>

        {/* Widget do Clube da Barbearia (Mobile) */}
        {data.clubOverview && (
          <ClubMetricsWidget overview={data.clubOverview} />
        )}
      </div>

      {/* 2. Divisão de Faturamento: Serviços vs Produtos */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-sm">
              Divisão: Serviços vs Produtos
            </h3>
            <p className="text-[11px] text-zinc-400">
              Mão de obra vs itens de balcão
            </p>
          </div>
          <ShoppingBag className="w-4 h-4 text-indigo-400" />
        </div>

        {/* Barra Proporcional */}
        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${revenueSplit.servicePercentage}%` }}
          />
          <div
            className="bg-amber-400 h-full transition-all"
            style={{ width: `${revenueSplit.productPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
              <Scissors className="w-3 h-3" /> Serviços ({revenueSplit.servicePercentage}%)
            </span>
            <span className="text-sm font-extrabold text-zinc-100 block">
              {formatHidden(formatCurrency(revenueSplit.serviceRevenue))}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              {revenueSplit.serviceCount} atendimentos
            </span>
          </div>

          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mb-0.5">
              <ShoppingBag className="w-3 h-3" /> Produtos ({revenueSplit.productPercentage}%)
            </span>
            <span className="text-sm font-extrabold text-zinc-100 block">
              {formatHidden(formatCurrency(revenueSplit.productRevenue))}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              {revenueSplit.productCount} vendidos
            </span>
          </div>
        </div>
      </div>

      {/* 3. Top Clientes do Mês */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-sm">
              Top Clientes do Mês
            </h3>
            <p className="text-[11px] text-zinc-400">
              Mais frequentes em {formattedMonth || 'mês atual'}
            </p>
          </div>
          <Link
            href="/clientes"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Ver CRM <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {data.topClients && data.topClients.slice(0, 5).map((client, idx) => (
            <div
              key={`${client.name}-${idx}`}
              className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}º
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-zinc-100 text-xs block truncate">
                    {client.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Última: {formatDate(client.lastVisitDate)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-extrabold text-emerald-400 text-xs block">
                  {formatCurrency(client.totalSpent)}
                </span>
                <span className="text-[10px] text-blue-400 font-semibold block">
                  {client.visitsCount} {client.visitsCount === 1 ? 'visita' : 'visitas'}
                </span>
              </div>
            </div>
          ))}

          {(!data.topClients || data.topClients.length === 0) && (
            <p className="py-4 text-center text-xs text-zinc-500">
              Nenhum atendimento registrado neste mês.
            </p>
          )}
        </div>
      </div>

      {/* 4. Produtos e Serviços Mais Vendidos */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-100 text-sm">
            Mais Vendidos
          </h3>
          <Link
            href="/produtos"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Catálogo <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {data.topProducts.slice(0, 5).map((p, idx) => (
            <div
              key={`${p.name}-${idx}`}
              className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Scissors className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-zinc-100 text-xs block truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    {p.salesCount} {p.salesCount === 1 ? 'saída' : 'saídas'}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-extrabold text-zinc-100 text-xs block">
                  {formatCurrency(p.revenue)}
                </span>
                {p.growth !== 0 && (
                  <span
                    className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                      p.growth > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {p.growth > 0 ? (
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    ) : (
                      <ArrowDownRight className="w-2.5 h-2.5" />
                    )}
                    {Math.abs(p.growth)}%
                  </span>
                )}
              </div>
            </div>
          ))}

          {data.topProducts.length === 0 && !loading && (
            <p className="py-4 text-center text-xs text-zinc-500">
              Nenhuma venda registrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* 5. Alerta de Retenção: Clientes para Retorno (+30 dias) */}
      {data.inactiveClientsAlerts && data.inactiveClientsAlerts.length > 0 && (
        <div className="p-4 bg-zinc-900 border border-amber-500/25 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              Retorno (+30 dias sem cortar)
            </h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {data.inactiveClientsAlerts.length}
            </span>
          </div>

          <div className="space-y-2">
            {data.inactiveClientsAlerts.slice(0, 4).map((client) => {
              return (
                <div
                  key={client.id}
                  className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-zinc-100 text-xs block truncate">
                      {client.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium block">
                      Sem visita há {client.daysSinceLastVisit} dias
                    </span>
                  </div>

                  {client.phone ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEngagementClient({
                          id: client.id,
                          name: client.name,
                          phone: client.phone,
                          daysSinceLastVisit: client.daysSinceLastVisit,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Zap
                    </button>
                  ) : (
                    <Link
                      href="/clientes"
                      className="text-[10px] text-zinc-400 px-2 py-1 bg-zinc-800 rounded-lg shrink-0"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {engagementClient && (
        <ClientEngagementWhatsAppModal
          isOpen={Boolean(engagementClient)}
          onClose={() => setEngagementClient(null)}
          client={engagementClient}
          purpose={
            engagementClient.daysSinceLastVisit >= 45
              ? 'inactive_recovery'
              : 'return_window'
          }
          daysSinceLastVisit={engagementClient.daysSinceLastVisit}
        />
      )}
    </div>
  );
}
