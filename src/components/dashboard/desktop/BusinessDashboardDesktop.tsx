'use client';

import Link from 'next/link';
import {
  Eye,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Pencil,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Plus,
  Users,
  MessageCircle,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import {
  BusinessDashboardData,
  BusinessPeriodStat,
  getBusinessDashboardData,
} from '@/lib/actions/dashboard';
import { useDateContext } from '@/context/DateContext';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import {
  ChartPeriodToolbar,
  ChartViewPeriod,
  useIndependentChartPeriod,
} from '../ChartPeriodToolbar';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { formatSalesUnit, formatSplitCount } from '@/lib/business-presets';
import { SegmentIcon } from '@/components/ui/SegmentIcon';
import { useState } from 'react';
import { ClientEngagementWhatsAppModal } from '@/components/clients/ClientEngagementWhatsAppModal';
import { ClubMetricsWidget } from '@/components/dashboard/ClubMetricsWidget';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

export type ChartPeriod = ChartViewPeriod;

export interface BusinessDashboardDesktopProps {
  data: BusinessDashboardData;
  accounts: AccountWithBalance[];
  formattedMonth?: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
  onAddBusinessExpense?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira / Dinheiro',
  investment: 'Investimento',
};

const EMPTY_BUSINESS_STATS: BusinessPeriodStat[] = [];

export function BusinessDashboardDesktop({
  data,
  accounts,
  formattedMonth,
  loading = false,
  onEditBalance,
  onAddBusinessExpense,
}: BusinessDashboardDesktopProps) {
  const [engagementClient, setEngagementClient] = useState<{
    id: string;
    name: string;
    phone?: string | null;
    daysSinceLastVisit: number;
  } | null>(null);

  const { profile, businessName, salesLabel } = useBusinessProfile();
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');
  const { month, year } = useDateContext();
  const businessChart = useIndependentChartPeriod<
    BusinessDashboardData,
    BusinessPeriodStat
  >(year, month, data, EMPTY_BUSINESS_STATS, getBusinessDashboardData);

  // Configura as séries do gráfico: Faturamento, Gastos do Negócio e Lucro Líquido
  const chartSeries: ChartSeries[] = [
    {
      id: 'revenue',
      name: 'Faturamento',
      color: '#38BDF8', // Azul Safira
      values: businessChart.activeStats.map((s) => s.revenue),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
    {
      id: 'expenses',
      name: `Gastos ${businessName}`,
      color: '#94A3B8', // Ardósia Metálico
      values: businessChart.activeStats.map((s) => s.expenses || 0),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
    {
      id: 'netProfit',
      name: 'Lucro Líquido',
      color: '#FACC15', // Canário Radiante
      values: businessChart.activeStats.map(
        (s) => s.netProfit ?? s.revenue - (s.expenses || 0)
      ),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
  ];

  const chartLabels = businessChart.activeStats.map((s) => s.label);
  const chartTooltipLabels = businessChart.activeStats.map(
    (s) => s.fullLabel || s.label
  );

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

  return (
    <div className="space-y-6 min-w-0">
      {/* 1ª Linha: Indicadores principais em 3 colunas equivalentes (gap 16px, altura ~134px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
        {/* Coluna 1: Faturamento Bruto & Atendimentos */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-h-[134px] min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#94A3B8]">
              Faturamento ({formattedMonth || 'Mês'})
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-400 block tabular-nums">
              {formatHidden(formatCurrency(summary.revenue))}
            </span>
            <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-[#94A3B8] tabular-nums">
              <span>Ticket médio: {formatHidden(formatCurrency(summary.averageTicket))}</span>
              <span>
                {summary.salesCount} {formatSalesUnit(summary.salesCount, salesLabel)}
                {summary.clientReturnRate > 1 ? ` • ${summary.clientReturnRate.toFixed(1)}x` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna 2: Lucro Líquido Real & Rentabilidade */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-h-[134px] min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#FACC15]">
                Lucro Líquido Real
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  summary.profitMargin >= 70
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : summary.profitMargin >= 40
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                }`}
              >
                {summary.revenue > 0 ? (showValues ? `${summary.profitMargin}% margem` : '••••') : '—'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-extrabold block tabular-nums ${
                summary.netProfit >= 0 ? 'text-[#F8FAFC]' : 'text-rose-400'
              }`}
            >
              {formatHidden(formatCurrency(summary.netProfit))}
            </span>
            <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-[#94A3B8] tabular-nums">
              <span>Após faturas: {formatHidden(formatCurrency(summary.projectedProfit))}</span>
              <div className="w-20 h-1.5 bg-[#080B11] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    summary.profitMargin >= 70
                      ? 'bg-emerald-400'
                      : summary.profitMargin >= 40
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, summary.profitMargin))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 3: Gastos do Negócio & Fiados a Receber */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-h-[134px] min-w-0 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-400">
              Gastos do Negócio
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-rose-400 block tabular-nums">
              {formatHidden(formatCurrency(summary.paidExpenses))}
            </span>
            <div className="flex items-center justify-between gap-2 mt-1 text-[11px] tabular-nums">
              <span className="text-[#94A3B8] truncate">
                {summary.pendingExpenses > 0
                  ? `+ ${formatHidden(formatCurrency(summary.pendingExpenses))} pend.`
                  : 'Custos em dia'}
              </span>
              <Link
                href="/fiados"
                className="text-[#FACC15] hover:text-[#FDE047] font-semibold flex items-center gap-0.5 shrink-0 transition-colors"
                title="Ver cobranças e fiados a receber"
              >
                <span>Fiados: {formatHidden(formatCurrency(summary.totalReceivables || 0))}</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Reposição de Estoque (Largura total quando houver itens em estoque baixo) */}
      {data.lowStockProducts && data.lowStockProducts.length > 0 && (
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">
                Alerta de Reposição de Estoque ({data.lowStockProducts.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Produtos ou peças atingiram o estoque mínimo configurado
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.lowStockProducts.map((prod) => (
              <span
                key={prod.id}
                className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold"
              >
                {prod.name}: <strong>{prod.stock_quantity}</strong> (mín. {prod.min_stock})
              </span>
            ))}
            <Link
              href="/produtos"
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 ml-2 shrink-0"
            >
              Repor <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Widget do Clube de Assinaturas & Mensalidades */}
      {data.clubOverview && (
        <ClubMetricsWidget overview={data.clubOverview} />
      )}

      {/* Alerta de Retenção: Clientes para Retorno (+30 dias) */}
      {data.inactiveClientsAlerts && data.inactiveClientsAlerts.length > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2 flex-wrap">
                  Atenção: Clientes para Retorno
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {data.inactiveClientsAlerts.length} para reativar
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Clientes que não cortam há mais de 30 dias. Chame no WhatsApp com 1 clique para agendar:
                </p>
              </div>
            </div>
            <Link
              href="/clientes"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 self-start sm:self-auto shrink-0"
            >
              Ver clientes
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {data.inactiveClientsAlerts.map((client) => {
              return (
                <div
                  key={client.id}
                  className="p-3 bg-[#080B11]/80 border border-[#1E293B] rounded-xl flex flex-col justify-between gap-2 hover:border-[#FACC15]/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-zinc-100 text-xs truncate">
                        {client.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold shrink-0">
                        há {client.daysSinceLastVisit}d
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {client.totalVisitsAllTime} visitas anteriores
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
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                      title="Chamar no WhatsApp com mensagem inteligente"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chamar no Zap
                    </button>
                  ) : (
                    <Link
                      href="/clientes"
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition text-center"
                    >
                      Cadastrar Tel.
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2ª Linha: Gráfico Principal (~2/3) e Bloco Lateral de Contas (~1/3), gap 20px */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-0">
        {/* Gráfico (Ocupa 2 colunas no desktop e largura total em telas menores) */}
        <div className="xl:col-span-2 min-w-0">
          <SmoothLineChart
            title={`Faturamento, Gastos e Lucro - ${businessName}`}
            subtitle={businessChart.subtitle}
            series={chartSeries}
            labels={chartLabels}
            tooltipLabels={chartTooltipLabels}
            height={270}
            rightAction={
              <ChartPeriodToolbar
                period={businessChart.period}
                onPeriodChange={businessChart.setPeriod}
                year={businessChart.year}
                month={businessChart.month}
                onYearChange={businessChart.handleYearChange}
                onMonthChange={businessChart.handleMonthChange}
                weeksMeta={businessChart.weeksMeta}
                selectedWeekIndex={businessChart.selectedWeekIndex}
                onWeekChange={businessChart.handleWeekChange}
                loading={businessChart.loading}
              />
            }
          />
        </div>

        {/* Saldo das Contas (Ocupa 1 coluna) */}
        <div className="xl:col-span-1 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-100 text-base">Saldo das Contas</h3>
              <Link
                href="/contas"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between hover:border-zinc-700/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    >
                      <CreditCard className="w-5 h-5 text-white/90" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-zinc-100 block">
                        {acc.name}
                      </span>
                      <span className="text-xs text-zinc-400 block">
                        {ACCOUNT_TYPE_LABELS[acc.type] || 'Conta Corrente'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditBalance && onEditBalance(acc)}
                    className="flex items-center gap-1.5 hover:text-emerald-400 group/bal transition text-right"
                    title="Editar saldo desta conta"
                  >
                    <span className="text-base font-extrabold text-zinc-100 group-hover/bal:text-emerald-400 transition">
                      {formatCurrency(acc.current_balance)}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-zinc-500 opacity-60 group-hover/bal:opacity-100 group-hover/bal:text-emerald-400 transition" />
                  </button>
                </div>
              ))}

              {accounts.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nenhuma conta cadastrada.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Saldo Total Acumulado</span>
            <span className="font-bold text-emerald-400 text-sm">
              {formatCurrency(
                accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3ª Linha: Três blocos com proporção ~1 : 1.3 : 1 (gap 20px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 min-w-0">
        {/* Bloco 1 (Proporção 1): Consumo por Meio de Pagamento */}
        <div className="md:col-span-1 xl:col-span-4 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Consumo por Meio
                </h3>
                <p className="text-xs text-zinc-400">
                  Gastos de {businessName} em {formattedMonth || 'mês atual'}
                </p>
              </div>
              {onAddBusinessExpense && (
                <button
                  type="button"
                  onClick={onAddBusinessExpense}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Gasto
                </button>
              )}
            </div>

            {data.expensesBySource && data.expensesBySource.length > 0 ? (
              <div className="space-y-3">
                {data.expensesBySource.map((src) => (
                  <div
                    key={src.id}
                    className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: src.color || '#f59e0b' }}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {src.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {src.type === 'card' ? 'Cartão' : 'Conta'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                          Pago: {formatCurrency(src.paidAmount)}
                          {src.pendingAmount > 0
                            ? ` • Pendente: ${formatCurrency(src.pendingAmount)}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-extrabold text-rose-400 shrink-0">
                      - {formatCurrency(src.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-zinc-500">
                Nenhum gasto do negócio registrado neste mês.
              </div>
            )}
          </div>
        </div>

        {/* Bloco 2 (Proporção 1.3): 5 Lançamentos Recentes (Vendas & Atendimentos) */}
        <div className="md:col-span-1 xl:col-span-5 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">Atendimentos Recentes</h3>
                <p className="text-xs text-zinc-400">Últimas vendas e serviços registrados</p>
              </div>
              <Link
                href="/vendas"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todos
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-semibold">Cliente</th>
                    <th className="pb-2.5 font-semibold">Conta</th>
                    <th className="pb-2.5 font-semibold text-right">Valor</th>
                    <th className="pb-2.5 font-semibold text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.recentSales && data.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-2.5 font-semibold text-zinc-100 truncate max-w-[110px]">
                        {sale.client_name}
                      </td>
                      <td className="py-2.5 text-zinc-400 truncate max-w-[80px]">
                        {sale.account_name}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        + {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-2.5 text-right text-zinc-400 font-mono text-[10px]">
                        {formatDateTime(sale.sale_date)}
                      </td>
                    </tr>
                  ))}

                  {(!data.recentSales || data.recentSales.length === 0) && !loading && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        Nenhum atendimento recente registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bloco 3 (Proporção 1): Últimos Gastos do Negócio */}
        <div className="md:col-span-2 xl:col-span-3 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Últimos Gastos
                </h3>
                <p className="text-xs text-zinc-400">
                  Despesas de {businessName}
                </p>
              </div>
              <Link
                href="/transacoes"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todos
              </Link>
            </div>

            {data.recentExpenses && data.recentExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-2.5 font-semibold">Gasto</th>
                      <th className="pb-2.5 font-semibold text-right">Valor</th>
                      <th className="pb-2.5 font-semibold text-right">Venc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {data.recentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-800/30 transition">
                        <td className="py-2.5 font-semibold text-zinc-100 max-w-[100px] truncate" title={exp.description}>
                          {exp.description}
                        </td>
                        <td className="py-2.5 text-right font-bold text-rose-400">
                          - {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-2.5 text-right text-zinc-400 font-mono text-[10px]">
                          {formatDate(exp.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-zinc-500">
                Nenhuma despesa lançada neste mês.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ponto de Equilíbrio (Break-Even) — Barra Horizontal de Largura Total */}
      {data.breakEven && (data.breakEven.totalExpenses > 0 || data.breakEven.revenue > 0) && (
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-zinc-100 text-base flex items-center gap-2.5 flex-wrap">
                Ponto de Equilíbrio (Break-Even)
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    data.breakEven.isReached
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {data.breakEven.isReached
                    ? 'Custos Cobertos'
                    : `${data.breakEven.progressPercent}% atingido`}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data.breakEven.isReached
                  ? `Superávit operacional de ${formatHidden(formatCurrency(data.breakEven.surplusAmount))} além de todos os custos do mês.`
                  : `Faltam ${formatHidden(formatCurrency(data.breakEven.remainingAmount))} (${
                      data.breakEven.salesNeeded > 0
                        ? `aprox. ${data.breakEven.salesNeeded} ${formatSalesUnit(data.breakEven.salesNeeded, salesLabel)}`
                        : 'em vendas'
                    }) para cobrir os custos totais do mês.`}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-base font-extrabold text-zinc-100 block">
                {formatHidden(formatCurrency(data.breakEven.revenue))}{' '}
                <span className="text-zinc-500 font-normal">/</span>{' '}
                <span className="text-zinc-300">
                  {formatHidden(formatCurrency(data.breakEven.totalExpenses))}
                </span>
              </span>
              {data.breakEven.partsAndProductsCost > 0 && (
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  Fixos/Oper.: {formatHidden(formatCurrency(data.breakEven.fixedAndOperationalExpenses))} • Peças/Prod.: {formatHidden(formatCurrency(data.breakEven.partsAndProductsCost))}
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                data.breakEven.isReached ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, data.breakEven.progressPercent))}%` }}
            />
          </div>
        </div>
      )}



      {/* Grade Analítica: Divisão Serviços vs Produtos + Top 5 Clientes do Mês */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Divisão de Faturamento: Serviços vs Produtos */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Divisão de Faturamento: Serviços vs Produtos
                </h3>
                <p className="text-xs text-zinc-400">
                  Mão de obra (cortes/barba) vs itens de prateleira em {formattedMonth || 'mês atual'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            {/* Barra Bipartida de Proporção */}
            <div className="space-y-4">
              <div className="w-full h-3.5 bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${data.revenueSplit?.servicePercentage || 0}%` }}
                  title={`Serviços: ${data.revenueSplit?.servicePercentage || 0}%`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${data.revenueSplit?.productPercentage || 0}%` }}
                  title={`Produtos: ${data.revenueSplit?.productPercentage || 0}%`}
                />
              </div>

              {/* Blocos de Detalhamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                    <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5" />
                    <span>Serviços ({data.revenueSplit?.servicePercentage || 0}%)</span>
                  </div>
                  <span className="text-base sm:text-lg font-extrabold text-zinc-100 block">
                    {formatCurrency(data.revenueSplit?.serviceRevenue || 0)}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {formatSplitCount(data.revenueSplit?.serviceCount || 0, 'service', summary.salesCount, salesLabel)}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Produtos ({data.revenueSplit?.productPercentage || 0}%)</span>
                  </div>
                  <span className="text-base sm:text-lg font-extrabold text-zinc-100 block">
                    {formatCurrency(data.revenueSplit?.productRevenue || 0)}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {formatSplitCount(data.revenueSplit?.productCount || 0, 'product', summary.salesCount, salesLabel)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Clientes Mais Assíduos do Mês */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Top 5 Clientes Mais Assíduos
                </h3>
                <p className="text-xs text-zinc-400">
                  Quem mais frequentou e faturou em {formattedMonth || 'mês atual'}
                </p>
              </div>
              <Link
                href="/clientes"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todos
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-semibold">Cliente</th>
                    <th className="pb-2.5 font-semibold text-center">Visitas</th>
                    <th className="pb-2.5 font-semibold text-right">Total Gasto</th>
                    <th className="pb-2.5 font-semibold text-right">Última Visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.topClients && data.topClients.map((client, idx) => (
                    <tr key={`${client.name}-${idx}`} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 font-semibold text-zinc-100 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}º
                        </span>
                        <span className="truncate max-w-[130px]">{client.name}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-[11px]">
                          {client.visitsCount} {client.visitsCount === 1 ? 'visita' : 'visitas'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        {formatCurrency(client.totalSpent)}
                      </td>
                      <td className="py-3 text-right text-zinc-400 font-mono text-[11px]">
                        {formatDate(client.lastVisitDate)}
                      </td>
                    </tr>
                  ))}

                  {(!data.topClients || data.topClients.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        Nenhum atendimento registrado neste mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Linha Inferior: 5 Produtos/Serviços mais vendidos */}
      <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-100 text-base">
                5 Produtos/Serviços mais vendidos
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Crescimento calculado com base no mesmo período do mês anterior
              </p>
            </div>
            <Link
              href="/produtos"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver todos
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 font-semibold">Produto</th>
                  <th className="pb-2.5 font-semibold text-center">Vendas</th>
                  <th className="pb-2.5 font-semibold text-right">Receita</th>
                  <th className="pb-2.5 font-semibold text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <span>Crescimento</span>
                      <span
                        className="cursor-help text-zinc-500 hover:text-zinc-300 transition"
                        title="Crescimento calculado comparando com o mesmo período (dia 1 até o dia atual) do mês anterior"
                      >
                        <Info className="w-3 h-3" />
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.topProducts.map((p, idx) => (
                  <tr key={`${p.name}-${idx}`} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 font-medium text-zinc-100 flex items-center gap-2">
                      <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-none">{p.name}</span>
                    </td>
                    <td className="py-3 text-center text-zinc-300 font-semibold">
                      {p.salesCount}
                    </td>
                    <td className="py-3 text-right font-bold text-zinc-100">
                      {formatCurrency(p.revenue)}
                    </td>
                    <td className="py-3 text-right">
                      {p.growth > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-emerald-400 font-bold text-[11px]"
                          title="Crescimento em relação ao mesmo período do mês anterior"
                        >
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          {p.growth}%
                        </span>
                      ) : p.growth < 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-rose-400 font-bold text-[11px]"
                          title="Queda em relação ao mesmo período do mês anterior"
                        >
                          <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                          {Math.abs(p.growth)}%
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 text-zinc-500 font-medium text-[11px]"
                          title="Sem variação em relação ao mesmo período do mês anterior"
                        >
                          <Minus className="w-3 h-3" />
                          0%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {data.topProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

