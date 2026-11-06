'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Share2,
  RotateCcw,
  ShoppingBag,
  Award,
  Crown,
  Calendar,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { MonthlyWrappedData } from '@/lib/monthly-wrapped-utils';
import { formatCurrency } from '@/lib/utils';

interface MonthlyWrappedStoriesProps {
  data: MonthlyWrappedData;
  onFinish?: () => void;
}

const SLIDE_DURATION = 6500; // 6.5 segundos por slide

export function MonthlyWrappedStories({ data, onFinish }: MonthlyWrappedStoriesProps) {
  // Quantidade de slides: se tiver business são 5 slides (0..4), senão são 4 (0..3)
  const totalSlides = data.hasBusiness && data.businessStats ? 5 : 4;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 a 100 para o slide atual
  const [isPaused, setIsPaused] = useState(false);

  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
      setProgress(0);
    } else {
      if (onFinish) onFinish();
    }
  }, [currentSlide, totalSlides, onFinish]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentSlide]);

  const restartStories = () => {
    setCurrentSlide(0);
    setProgress(0);
    setIsPaused(false);
  };

  // Loop de animação de progresso suave
  useEffect(() => {
    if (isPaused) {
      lastTimeRef.current = null;
      return;
    }

    const updateProgress = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setProgress((prev) => {
        const increment = (elapsed / SLIDE_DURATION) * 100;
        const nextVal = prev + increment;
        if (nextVal >= 100) {
          nextSlide();
          return 0;
        }
        return nextVal;
      });

      animFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentSlide, isPaused, nextSlide]);

  // Teclado (Setas para navegar, Espaço para pausar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Retrospectiva ${data.monthName} de ${data.year}`,
          text: data.shareText,
        });
        return;
      } catch {
        // Fallback para WhatsApp
      }
    }
    const encoded = encodeURIComponent(data.shareText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Mapeamento dos slides:
  // Slide 0: Veredito & Título do Mês
  // Slide 1: Raio-X dos Gastos
  // Slide 2 (se hasBusiness): O Show do Negócio
  // Slide 3 (ou 2 se sem business): Cartão e Rendimentos
  // Slide 4 (ou 3 se sem business): Pôster Final & Compartilhar

  const isBusinessSlide = data.hasBusiness && data.businessStats && currentSlide === 2;
  const isCardsYieldsSlide = data.hasBusiness && data.businessStats ? currentSlide === 3 : currentSlide === 2;
  const isFinalSlide = currentSlide === totalSlides - 1;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] max-h-[82vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between select-none bg-slate-950 text-white border border-white/10">
      {/* Barras de Progresso no Topo */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 pt-3 flex gap-1.5 pointer-events-none">
        {Array.from({ length: totalSlides }).map((_, idx) => {
          let fillPercent = 0;
          if (idx < currentSlide) fillPercent = 100;
          else if (idx === currentSlide) fillPercent = progress;

          return (
            <div
              key={idx}
              className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Cabeçalho do Slide */}
      <div className="relative z-20 pt-7 px-4 flex items-center justify-between text-xs text-white/80">
        <div className="flex items-center gap-1.5 font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{data.monthName} {data.year}</span>
        </div>

        <button
          onClick={() => setIsPaused((p) => !p)}
          className="p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors cursor-pointer"
          aria-label={isPaused ? 'Continuar' : 'Pausar'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Áreas de Toque para avançar/voltar (Stories Touch Zones) */}
      <div
        className="absolute inset-y-16 left-0 w-1/3 z-10 cursor-pointer"
        onClick={prevSlide}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      />
      <div
        className="absolute inset-y-16 right-0 w-2/3 z-10 cursor-pointer"
        onClick={nextSlide}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      />

      {/* Conteúdo Dinâmico do Slide */}
      <div className="relative z-0 flex-1 px-5 py-4 flex flex-col justify-center pointer-events-none">
        {/* SLIDE 0: Veredito e Título */}
        {currentSlide === 0 && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500 text-center">
            <div className="inline-block p-4 rounded-3xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-6xl shadow-xl shadow-fuchsia-600/30">
              {data.monthTitle.badge}
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-violet-300 font-semibold">
                Seu Veredito de {data.monthName}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-white">
                {data.monthTitle.title}
              </h2>
              <p className="text-sm text-white/80 mt-2 px-2 leading-relaxed">
                {data.monthTitle.description}
              </p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[11px] text-white/60 block">Saldo Final</span>
                <span className={`text-lg font-black ${data.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(data.netBalance)}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[11px] text-white/60 block">Taxa de Poupança</span>
                <span className="text-lg font-black text-amber-300">
                  {data.savingsRate}%
                </span>
              </div>
            </div>

            {data.balanceGrowthPercent !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs border border-white/10 text-white/90">
                {data.balanceGrowthPercent >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {data.balanceGrowthPercent > 0 ? '+' : ''}{data.balanceGrowthPercent}% em relação ao mês anterior
                </span>
              </div>
            )}
          </div>
        )}

        {/* SLIDE 1: Raio-X dos Gastos */}
        {currentSlide === 1 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest text-rose-300 font-semibold">
                Raio-X das Despesas
              </span>
              <h2 className="text-2xl font-black mt-1 text-white">
                Onde Foi Parar a Grana? 💸
              </h2>
              <p className="text-xs text-white/70 mt-1">
                Total desembolsado no mês: <strong className="text-white">{formatCurrency(data.totalExpense)}</strong>
              </p>
            </div>

            {/* O Vilão do Mês */}
            {data.largestExpense && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/70 to-rose-900/40 border border-rose-500/30 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-rose-300 font-medium">
                  <span>🚨 O Maior Gasto Único</span>
                  <span>{formatCurrency(data.largestExpense.amount)}</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {data.largestExpense.description}
                </div>
                {data.largestExpense.categoryName && (
                  <span className="text-[11px] text-white/60">
                    Categoria: {data.largestExpense.categoryName}
                  </span>
                )}
              </div>
            )}

            {/* Categoria Campeã e Top Categorias */}
            {data.topCategory && (
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-2">
                <div className="text-xs text-white/70">
                  🏆 Categoria campeã em despesas:
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-white">
                    {data.topCategory.name}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                    {data.topCategory.percentage}% do total
                  </span>
                </div>
                <div className="text-sm font-semibold text-rose-300">
                  {formatCurrency(data.topCategory.amount)}
                </div>
              </div>
            )}

            {data.topCategories.length > 1 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-white/60 block">Outras categorias de destaque:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.topCategories.slice(1).map((cat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-white/90 border border-white/10"
                    >
                      {cat.name}: {formatCurrency(cat.amount)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SLIDE 2 (se hasBusiness): O Show do Negócio */}
        {isBusinessSlide && data.businessStats && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest text-violet-300 font-semibold flex items-center justify-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> {data.businessName}
              </span>
              <h2 className="text-2xl font-black mt-1 text-white">
                O Show do Seu Negócio 💈
              </h2>
              <div className="text-xl font-black text-violet-300 mt-1">
                {formatCurrency(data.businessStats.totalRevenue)}
              </div>
              <span className="text-xs text-white/70">
                em {data.businessStats.totalSalesCount} atendimentos realizados
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {data.businessStats.topProductOrService && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md">
                  <div className="flex items-center gap-1 text-xs text-amber-300 font-medium">
                    <Award className="w-3.5 h-3.5" /> Campeão de Vendas
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {data.businessStats.topProductOrService.name}
                  </div>
                  <span className="text-[11px] text-white/70">
                    {data.businessStats.topProductOrService.quantity} saídas ({formatCurrency(data.businessStats.topProductOrService.revenue)})
                  </span>
                </div>
              )}

              {data.businessStats.vipClient && (
                <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 backdrop-blur-md">
                  <div className="flex items-center gap-1 text-xs text-indigo-300 font-medium">
                    <Crown className="w-3.5 h-3.5" /> Cliente Mais Fiel (VIP)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {data.businessStats.vipClient.name}
                  </div>
                  <span className="text-[11px] text-white/70">
                    {data.businessStats.vipClient.visitsCount} visitas no mês ({formatCurrency(data.businessStats.vipClient.totalSpent)})
                  </span>
                </div>
              )}

              {data.businessStats.busiestDayOfWeek && (
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-center text-xs text-white/80">
                  <span className="flex items-center justify-center gap-1 text-white font-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> {data.businessStats.busiestDayOfWeek.name}
                  </span>
                  <span>foi o dia da semana com mais clientes ({data.businessStats.busiestDayOfWeek.count} atendimentos)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE: Cartão & Rendimentos */}
        {isCardsYieldsSlide && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500 text-center">
            <div>
              <span className="text-xs uppercase tracking-widest text-sky-300 font-semibold">
                Contas e Faturas
              </span>
              <h2 className="text-2xl font-black mt-1 text-white">
                Cartão & Rendimentos 💳
              </h2>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 backdrop-blur-md text-left space-y-1">
              <span className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> Fatura do Cartão de Crédito
              </span>
              <div className="text-2xl font-black text-white">
                {formatCurrency(data.creditCardTotal)}
              </div>
              <p className="text-xs text-white/70 pt-1">
                {data.creditCardTotal > 0
                  ? 'Fatura fechada no período. Manter sob controle é a chave!'
                  : 'Nenhum gasto em cartão no mês. Zero sustos na fatura! 🚀'}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 backdrop-blur-md text-left space-y-1">
              <span className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4" /> Dinheiro Trabalhando Por Você
              </span>
              <div className="text-2xl font-black text-emerald-400">
                +{formatCurrency(data.accountYieldTotal)}
              </div>
              <p className="text-xs text-white/70 pt-1">
                {data.accountYieldTotal > 0
                  ? 'Rendimentos passivos creditados nas suas contas.'
                  : 'Ative contas remuneradas para fazer cada centavo render!'}
              </p>
            </div>
          </div>
        )}

        {/* SLIDE FINAL: Pôster Síntese & Compartilhar */}
        {isFinalSlide && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 text-center">
            <div className="inline-block text-4xl animate-bounce">
              🎉
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
                Fechamento Concluído
              </span>
              <h2 className="text-2xl font-black mt-0.5 text-white">
                Mês de {data.monthName} no Bolso!
              </h2>
              <p className="text-xs text-white/80 mt-1">
                {data.monthTitle.title} {data.monthTitle.badge}
              </p>
            </div>

            {/* Mini Card Resumo */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/70">Saldo Final</span>
                <span className={`font-bold ${data.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(data.netBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/70">Taxa de Poupança</span>
                <span className="font-bold text-amber-300">{data.savingsRate}%</span>
              </div>
              {data.hasBusiness && data.businessStats && (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Faturamento {data.businessName}</span>
                  <span className="font-bold text-violet-300">
                    {formatCurrency(data.businessStats.totalRevenue)}
                  </span>
                </div>
              )}
            </div>

            {/* Ações interativas no slide final */}
            <div className="pt-2 space-y-2 pointer-events-auto">
              <button
                onClick={handleShare}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar no WhatsApp</span>
              </button>

              <button
                onClick={restartStories}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white/80 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ver Novamente do Começo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé do Container com botões discretos de navegação */}
      <div className="relative z-20 pb-4 px-4 flex items-center justify-between text-xs text-white/60">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-all cursor-pointer"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="font-mono text-[11px] select-none">
          {currentSlide + 1} de {totalSlides}
        </span>

        <button
          onClick={nextSlide}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          aria-label="Próximo slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
