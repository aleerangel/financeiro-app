'use client';

import Link from 'next/link';
import { Eye, CreditCard, ArrowUpRight, ArrowDownRight, Minus, Scissors } from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { BusinessDashboardData } from '@/lib/actions/dashboard';
import { SmoothLineChart, ChartSeries } from './SmoothLineChart';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface BusinessDashboardViewProps {
  data: BusinessDashboardData;
  accounts: AccountWithBalance[];
  loading?: boolean;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira / Dinheiro',
  investment: 'Investimento',
};

export function BusinessDashboardView({
  data,
  accounts,
  loading = false,
}: BusinessDashboardViewProps) {
  // Configura as séries do gráfico no estilo do mockup:
  // Receita (amarelo) e Vendas (verde)
  const chartSeries: ChartSeries[] = [
    {
      id: 'revenue',
      name: 'Receita',
      color: '#eab308', // Amarelo
      values: data.monthlyStats.map((s) => s.revenue),
      formatValue: (v) => formatCurrency(v),
    },
    {
      id: 'sales',
      name: 'Vendas',
      color: '#22c55e', // Verde
      values: data.monthlyStats.map((s) => s.revenue), // Curva de vendas em R$
      formatValue: (v) => formatCurrency(v),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Linha Superior: Gráfico de Vendas e Receita Mensal + Saldo das Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico (Ocupa 2 colunas no desktop) */}
        <div className="lg:col-span-2">
          <SmoothLineChart
            title="Vendas e receita mensal"
            series={chartSeries}
            height={270}
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

                  <span className="text-base font-extrabold text-zinc-100">
                    {formatCurrency(acc.current_balance)}
                  </span>
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
