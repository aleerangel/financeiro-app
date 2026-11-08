'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  PiggyBank,
  Crown,
  Calendar,
  Share2,
  Check,
  Award,
} from 'lucide-react';
import { MonthlyWrappedData } from '@/lib/monthly-wrapped-utils';
import { formatCurrency } from '@/lib/utils';

interface MonthlyWrappedSummaryViewProps {
  data: MonthlyWrappedData;
}

export function MonthlyWrappedSummaryView({ data }: MonthlyWrappedSummaryViewProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Retrospectiva ${data.monthName} de ${data.year}`,
          text: data.shareText,
        });
        return;
      } catch {
        // Usuário cancelou ou navegador falhou, segue pro fallback
      }
    }

    // Fallback: WhatsApp Web / URI
    const encoded = encodeURIComponent(data.shareText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 pb-6 max-w-2xl mx-auto">
      {/* Cabeçalho do Veredito com Atmosfera Canário & Meia-Noite */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D121F] via-[#151D30] to-[#080B11] border border-[#FACC15]/30 text-[#F8FAFC] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-44 h-44 bg-[#FACC15]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 bg-[#38BDF8]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/30 text-xs font-extrabold tracking-wide uppercase text-[#FDE047]">
            <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" /> Retrospectiva {data.monthName} {data.year}
          </div>

          <div className="text-5xl my-1 select-none animate-bounce">{data.monthTitle.badge}</div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F8FAFC]">
            {data.monthTitle.title}
          </h2>

          <p className="text-[#94A3B8] text-sm sm:text-base max-w-md">
            {data.monthTitle.description}
          </p>

          <div className="w-full pt-4 mt-2 border-t border-[#1E293B] grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-[#080B11]/90 backdrop-blur-sm rounded-2xl p-3 border border-[#1E293B]">
              <span className="text-xs text-[#64748B] block font-medium">Saldo Final</span>
              <span className={`text-base sm:text-lg font-bold tabular-nums ${data.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(data.netBalance)}
              </span>
            </div>
            <div className="bg-[#080B11]/90 backdrop-blur-sm rounded-2xl p-3 border border-[#1E293B]">
              <span className="text-xs text-[#64748B] block font-medium">Taxa Poupança</span>
              <span className="text-base sm:text-lg font-bold text-[#FACC15] tabular-nums">
                {data.savingsRate}%
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#080B11]/90 backdrop-blur-sm rounded-2xl p-3 border border-[#1E293B]">
              <span className="text-xs text-[#64748B] block font-medium">vs Mês Anterior</span>
              <span className="text-base sm:text-lg font-bold text-[#F8FAFC] flex items-center justify-center gap-1 tabular-nums">
                {data.balanceGrowthPercent !== null ? (
                  <>
                    {data.balanceGrowthPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400 inline" />
                    )}
                    {data.balanceGrowthPercent > 0 ? '+' : ''}{data.balanceGrowthPercent}%
                  </>
                ) : (
                  'Primeiro mês'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 1: Entradas vs Saídas */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0D121F] p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-[#FACC15]" /> Balanço do Mês
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-medium text-emerald-400 block mb-1">
              Total de Entradas
            </span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">
              {formatCurrency(data.totalIncome)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-xs font-medium text-rose-400 block mb-1">
              Total de Despesas
            </span>
            <span className="text-xl font-bold text-rose-400 tabular-nums">
              {formatCurrency(data.totalExpense)}
            </span>
            {data.expenseChangePercent !== null && (
              <span className="text-[11px] text-[#64748B] block mt-1 tabular-nums">
                {data.expenseChangePercent >= 0 ? '↑ ' : '↓ '}
                {Math.abs(data.expenseChangePercent)}% em relação ao mês anterior
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Raio-X dos Gastos */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0D121F] p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400" /> Raio-X dos Gastos
        </h3>

        {data.largestExpense && (
          <div className="p-4 rounded-xl bg-[#080B11] border border-rose-500/30 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                O Maior Gasto do Mês
              </span>
              <p className="text-base font-bold text-[#F8FAFC] mt-0.5">
                {data.largestExpense.description}
              </p>
              {data.largestExpense.categoryName && (
                <span className="text-xs text-[#94A3B8]">
                  Categoria: {data.largestExpense.categoryName}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-bold text-rose-400 tabular-nums">
                {formatCurrency(data.largestExpense.amount)}
              </span>
            </div>
          </div>
        )}

        {data.topCategories.length > 0 && (
          <div>
            <span className="text-xs font-medium text-[#94A3B8] block mb-2">
              Categorias que Mais Pesaram no Bolso:
            </span>
            <div className="space-y-2.5">
              {data.topCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-[#F8FAFC]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-[#94A3B8] tabular-nums">
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#080B11] border border-[#1E293B] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color || '#FACC15',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card 3: Negócio / Barbearia (se hasBusiness) */}
      {data.hasBusiness && data.businessStats && (
        <div className="rounded-2xl border border-[#1E293B] bg-[#0D121F] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FACC15]" /> Desempenho: {data.businessName}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30">
              {data.businessStats.totalSalesCount} Atendimentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#080B11] border border-[#FACC15]/30">
              <span className="text-xs text-[#FACC15] block mb-0.5 font-medium">
                Faturamento Bruto
              </span>
              <span className="text-xl font-black text-[#FACC15] tabular-nums">
                {formatCurrency(data.businessStats.totalRevenue)}
              </span>
              {data.businessStats.revenueGrowthPercent !== null && (
                <span className="text-[11px] text-[#64748B] block mt-1 tabular-nums">
                  {data.businessStats.revenueGrowthPercent >= 0 ? '↑ +' : '↓ '}
                  {data.businessStats.revenueGrowthPercent}% em relação ao mês anterior
                </span>
              )}
            </div>

            {data.businessStats.busiestDayOfWeek && (
              <div className="p-3.5 rounded-xl bg-[#080B11] border border-[#1E293B]">
                <span className="text-xs text-[#94A3B8] block mb-0.5 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" /> Dia Mais Movimentado
                </span>
                <span className="text-base font-bold text-[#F8FAFC]">
                  {data.businessStats.busiestDayOfWeek.name}
                </span>
                <span className="text-[11px] text-[#64748B] block mt-1">
                  {data.businessStats.busiestDayOfWeek.count} atendimentos realizados
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {data.businessStats.topProductOrService && (
              <div className="p-3.5 rounded-xl bg-[#080B11] border border-[#FACC15]/30">
                <span className="text-xs font-semibold text-[#FACC15] flex items-center gap-1 mb-1">
                  <Award className="w-3.5 h-3.5" /> Campeão de Vendas
                </span>
                <p className="text-sm font-bold text-[#F8FAFC]">
                  {data.businessStats.topProductOrService.name}
                </p>
                <span className="text-xs text-[#94A3B8] tabular-nums">
                  {data.businessStats.topProductOrService.quantity} vendas (
                  {formatCurrency(data.businessStats.topProductOrService.revenue)})
                </span>
              </div>
            )}

            {data.businessStats.vipClient && (
              <div className="p-3.5 rounded-xl bg-[#080B11] border border-indigo-500/30">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 mb-1">
                  <Crown className="w-3.5 h-3.5" /> Cliente Mais Fiel (VIP)
                </span>
                <p className="text-sm font-bold text-[#F8FAFC]">
                  {data.businessStats.vipClient.name}
                </p>
                <span className="text-xs text-[#94A3B8] tabular-nums">
                  {data.businessStats.vipClient.visitsCount} visitas no mês (
                  {formatCurrency(data.businessStats.vipClient.totalSpent)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card 4: Cartão & Rendimentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-indigo-500/30 bg-[#0D121F] p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-indigo-400" /> Fatura do Cartão
          </span>
          <div className="text-xl font-bold text-[#F8FAFC] tabular-nums">
            {formatCurrency(data.creditCardTotal)}
          </div>
          <p className="text-xs text-[#94A3B8]">
            {data.creditCardTotal > 0
              ? 'Total comprometido na fatura neste mês.'
              : 'Sem gastos de cartão no período. Parabéns pela disciplina!'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#0D121F] p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-emerald-400" /> Rendimentos em Conta
          </span>
          <div className="text-xl font-bold text-emerald-400 tabular-nums">
            +{formatCurrency(data.accountYieldTotal)}
          </div>
          <p className="text-xs text-[#94A3B8]">
            {data.accountYieldTotal > 0
              ? 'Dinheiro gerado passivamente pelas suas contas com rendimento.'
              : 'Nenhum rendimento passivo registrado neste mês.'}
          </p>
        </div>
      </div>

      {/* Botões de Ação / Compartilhamento */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleShare}
          className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar no WhatsApp</span>
        </button>

        <button
          onClick={handleCopy}
          className="w-full sm:w-auto py-3 px-5 rounded-xl font-semibold text-sm border border-[#1E293B] bg-[#151D30] hover:bg-[#1E293B] text-[#F8FAFC] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-[#FACC15]" />}
          <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
        </button>
      </div>
    </div>
  );
}
