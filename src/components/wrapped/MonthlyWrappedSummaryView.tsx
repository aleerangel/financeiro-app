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
      {/* Cabeçalho do Veredito */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Retrospectiva {data.monthName} {data.year}
          </div>

          <div className="text-5xl my-1 select-none animate-bounce">{data.monthTitle.badge}</div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {data.monthTitle.title}
          </h2>

          <p className="text-white/85 text-sm sm:text-base max-w-md">
            {data.monthTitle.description}
          </p>

          <div className="w-full pt-4 mt-2 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <span className="text-xs text-white/70 block">Saldo Final</span>
              <span className={`text-base sm:text-lg font-bold ${data.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatCurrency(data.netBalance)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <span className="text-xs text-white/70 block">Taxa Poupança</span>
              <span className="text-base sm:text-lg font-bold text-amber-300">
                {data.savingsRate}%
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <span className="text-xs text-white/70 block">vs Mês Anterior</span>
              <span className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-1">
                {data.balanceGrowthPercent !== null ? (
                  <>
                    {data.balanceGrowthPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-300 inline" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-300 inline" />
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
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-primary" /> Balanço do Mês
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block mb-1">
              Total de Entradas
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(data.totalIncome)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block mb-1">
              Total de Despesas
            </span>
            <span className="text-xl font-bold text-rose-700 dark:text-rose-300">
              {formatCurrency(data.totalExpense)}
            </span>
            {data.expenseChangePercent !== null && (
              <span className="text-[11px] text-muted-foreground block mt-1">
                {data.expenseChangePercent >= 0 ? '↑ ' : '↓ '}
                {Math.abs(data.expenseChangePercent)}% em relação ao mês anterior
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Raio-X dos Gastos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" /> Raio-X dos Gastos
        </h3>

        {data.largestExpense && (
          <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                O Maior Gasto do Mês
              </span>
              <p className="text-base font-bold text-foreground mt-0.5">
                {data.largestExpense.description}
              </p>
              {data.largestExpense.categoryName && (
                <span className="text-xs text-muted-foreground">
                  Categoria: {data.largestExpense.categoryName}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(data.largestExpense.amount)}
              </span>
            </div>
          </div>
        )}

        {data.topCategories.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              Categorias que Mais Pesaram no Bolso:
            </span>
            <div className="space-y-2.5">
              {data.topCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color || '#8b5cf6',
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-violet-500" /> Desempenho: {data.businessName}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
              {data.businessStats.totalSalesCount} Atendimentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className="text-xs text-violet-700 dark:text-violet-300 block mb-0.5 font-medium">
                Faturamento Bruto
              </span>
              <span className="text-xl font-bold text-violet-800 dark:text-violet-200">
                {formatCurrency(data.businessStats.totalRevenue)}
              </span>
              {data.businessStats.revenueGrowthPercent !== null && (
                <span className="text-[11px] text-muted-foreground block mt-1">
                  {data.businessStats.revenueGrowthPercent >= 0 ? '↑ +' : '↓ '}
                  {data.businessStats.revenueGrowthPercent}% em relação ao mês anterior
                </span>
              )}
            </div>

            {data.businessStats.busiestDayOfWeek && (
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border">
                <span className="text-xs text-muted-foreground block mb-0.5 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Dia Mais Movimentado
                </span>
                <span className="text-base font-bold text-foreground">
                  {data.businessStats.busiestDayOfWeek.name}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  {data.businessStats.busiestDayOfWeek.count} atendimentos realizados
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {data.businessStats.topProductOrService && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                  <Award className="w-3.5 h-3.5" /> Campeão de Vendas
                </span>
                <p className="text-sm font-bold text-foreground">
                  {data.businessStats.topProductOrService.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {data.businessStats.topProductOrService.quantity} vendas (
                  {formatCurrency(data.businessStats.topProductOrService.revenue)})
                </span>
              </div>
            )}

            {data.businessStats.vipClient && (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1 mb-1">
                  <Crown className="w-3.5 h-3.5" /> Cliente Mais Fiel (VIP)
                </span>
                <p className="text-sm font-bold text-foreground">
                  {data.businessStats.vipClient.name}
                </p>
                <span className="text-xs text-muted-foreground">
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-primary" /> Fatura do Cartão
          </span>
          <div className="text-xl font-bold text-foreground">
            {formatCurrency(data.creditCardTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.creditCardTotal > 0
              ? 'Total comprometido na fatura neste mês.'
              : 'Sem gastos de cartão no período. Parabéns pela disciplina!'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-emerald-500" /> Rendimentos em Conta
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.accountYieldTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
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
          className="w-full sm:flex-1 py-3 px-4 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar no WhatsApp</span>
        </button>

        <button
          onClick={handleCopy}
          className="w-full sm:w-auto py-3 px-5 rounded-xl font-medium text-sm border border-border bg-card hover:bg-accent text-foreground active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Sparkles className="w-4 h-4 text-primary" />}
          <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
        </button>
      </div>
    </div>
  );
}
