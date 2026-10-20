'use client';

import Link from 'next/link';
import {
  Eye,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Scissors,
  Pencil,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Plus,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import {
  BusinessDashboardData,
  BusinessPeriodStat,
  getBusinessDashboardData,
} from '@/lib/actions/dashboard';
import { useDateContext } from '@/context/DateContext';
import { SmoothLineChart, ChartSeries } from './SmoothLineChart';
import {
  ChartPeriodToolbar,
  ChartViewPeriod,
  useIndependentChartPeriod,
} from './ChartPeriodToolbar';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';

export type ChartPeriod = ChartViewPeriod;

interface BusinessDashboardViewProps {
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

export function BusinessDashboardView({
  data,
  accounts,
  formattedMonth,
  loading = false,
  onEditBalance,
  onAddBusinessExpense,
}: BusinessDashboardViewProps) {
  const { month, year } = useDateContext();
  const businessChart = useIndependentChartPeriod<
    BusinessDashboardData,
    BusinessPeriodStat
  >(year, month, data, EMPTY_BUSINESS_STATS, getBusinessDashboardData);

  // Configura as séries do gráfico: Faturamento, Gastos da Barbearia e Lucro Líquido
  const chartSeries: ChartSeries[] = [
    {
      id: 'revenue',
      name: 'Faturamento',
      color: '#22c55e', // Verde
      values: businessChart.activeStats.map((s) => s.revenue),
      formatValue: (v) => formatCurrency(v),
    },
    {
      id: 'expenses',
      name: 'Gastos Barbearia',
      color: '#f43f5e', // Rosa/Vermelho
      values: businessChart.activeStats.map((s) => s.expenses || 0),
      formatValue: (v) => formatCurrency(v),
    },
    {
      id: 'netProfit',
      name: 'Lucro Líquido',
      color: '#eab308', // Amarelo/Dourado
      values: businessChart.activeStats.map(
        (s) => s.netProfit ?? s.revenue - (s.expenses || 0)
      ),
      formatValue: (v) => formatCurrency(v),
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
    averageTicket: 0,
  };

  return (
    <div className="space-y-6">
      {/* KPIs de Resultado Real da Barbearia no Mês Selecionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Faturamento Bruto */}
        <div className="p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
              Faturamento ({formattedMonth || 'Mês'})
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-extrabold text-emerald-400 block">
              {formatCurrency(summary.revenue)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {summary.salesCount} atendimentos • Ticket {formatCurrency(summary.averageTicket)}
            </span>
          </div>
        </div>

        {/* 2. Gastos da Barbearia */}
        <div className="p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-400">
              Gastos da Barbearia
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-extrabold text-rose-400 block">
              {formatCurrency(summary.paidExpenses)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {summary.pendingExpenses > 0
                ? `+ ${formatCurrency(summary.pendingExpenses)} em aberto/fatura`
                : 'Nenhum custo pendente'}
            </span>
          </div>
        </div>

        {/* 3. Lucro Líquido Real */}
        <div className="p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400">
              Lucro Líquido Real
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-lg sm:text-2xl font-extrabold block ${
                summary.netProfit >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netProfit)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Após faturas: {formatCurrency(summary.projectedProfit)}
            </span>
          </div>
        </div>

        {/* 4. Margem de Lucro (%) */}
        <div className="p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
              Margem de Lucro
            </span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-lg sm:text-2xl font-extrabold block ${
                summary.profitMargin >= 70
                  ? 'text-emerald-400'
                  : summary.profitMargin >= 40
                  ? 'text-amber-300'
                  : summary.revenue > 0
                  ? 'text-rose-400'
                  : 'text-zinc-400'
              }`}
            >
              {summary.revenue > 0 ? `${summary.profitMargin}%` : '—'}
            </span>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
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
      {/* Linha Superior: Gráfico de Vendas e Receita + Saldo das Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico (Ocupa 2 colunas no desktop) */}
        <div className="lg:col-span-2">
          <SmoothLineChart
            title="Faturamento, Gastos e Lucro da Barbearia"
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
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
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

      {/* Controle de Gastos da Barbearia: Consumo por Cartão/Conta + Últimos Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumo da Barbearia por Conta / Cartão */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Consumo da Barbearia por Cartão / Conta
                </h3>
                <p className="text-xs text-zinc-400">
                  Quanto os gastos da barbearia utilizaram de cada meio em {formattedMonth || 'mês atual'}
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
                    className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: src.color || '#f59e0b' }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-100 truncate">
                            {src.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                            {src.type === 'card' ? 'Cartão' : 'Conta'}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 block mt-0.5">
                          Pago: {formatCurrency(src.paidAmount)}
                          {src.pendingAmount > 0
                            ? ` • Na fatura/pendente: ${formatCurrency(src.pendingAmount)}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <span className="text-sm sm:text-base font-extrabold text-rose-400 shrink-0">
                      - {formatCurrency(src.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-zinc-500">
                Nenhum gasto da barbearia registrado neste mês.
              </div>
            )}
          </div>
        </div>

        {/* Últimos Gastos da Barbearia (Insumos, Lâminas, Produtos, etc.) */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">
                  Últimos Gastos da Barbearia
                </h3>
                <p className="text-xs text-zinc-400">
                  Insumos, descartáveis, produtos e contas fixas do negócio
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
                      <th className="pb-2.5 font-semibold">Insumo / Gasto</th>
                      <th className="pb-2.5 font-semibold">Meio</th>
                      <th className="pb-2.5 font-semibold text-right">Valor</th>
                      <th className="pb-2.5 font-semibold text-right">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {data.recentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 font-semibold text-zinc-100 max-w-[140px] truncate">
                          {exp.description}
                        </td>
                        <td className="py-3 text-zinc-400">
                          {exp.source_name}
                        </td>
                        <td className="py-3 text-right font-bold text-rose-400">
                          - {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 text-right text-zinc-400 font-mono text-[11px]">
                          {formatDate(exp.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-zinc-500">
                Nenhuma despesa da barbearia lançada neste mês.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha Inferior: 5 Produtos/Serviços mais vendidos + 5 Lançamentos recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5 Produtos/Serviços mais vendidos */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-100 text-base">
                5 Produtos/Serviços mais vendidos
              </h3>
              <Link
                href="/produtos"
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
                    <th className="pb-2.5 font-semibold">Produto</th>
                    <th className="pb-2.5 font-semibold text-center">Vendas</th>
                    <th className="pb-2.5 font-semibold text-right">Receita</th>
                    <th className="pb-2.5 font-semibold text-right">Crescimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.topProducts.map((p, idx) => (
                    <tr key={`${p.name}-${idx}`} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 font-medium text-zinc-100 flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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
                          <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold text-[11px]">
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                            {p.growth}%
                          </span>
                        ) : p.growth < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold text-[11px]">
                            <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                            {Math.abs(p.growth)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-zinc-500 font-medium text-[11px]">
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

        {/* 5 Lançamentos recentes */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-100 text-base">5 Lançamentos recentes</h3>
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
                    <th className="pb-2.5 font-semibold">Descrição</th>
                    <th className="pb-2.5 font-semibold">Conta</th>
                    <th className="pb-2.5 font-semibold text-right">Valor</th>
                    <th className="pb-2.5 font-semibold text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 font-semibold text-zinc-100 truncate max-w-[120px]">
                        {sale.client_name}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {sale.account_name}
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        + {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 text-right text-zinc-400 font-mono text-[11px]">
                        {formatDateTime(sale.sale_date)}
                      </td>
                    </tr>
                  ))}

                  {data.recentSales.length === 0 && !loading && (
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
      </div>
    </div>
  );
}

