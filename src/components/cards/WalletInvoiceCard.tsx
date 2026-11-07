'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard as CardIcon,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Wifi,
} from 'lucide-react';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { formatCurrency } from '@/lib/utils';
import { getCardInvoiceStatus } from '@/lib/credit-card-utils';

interface WalletInvoiceCardProps {
  cards: CreditCardWithUsage[];
  showValues?: boolean;
  className?: string;
}

export function WalletInvoiceCard({
  cards,
  showValues = true,
  className = '',
}: WalletInvoiceCardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastSelectedCardId, setLastSelectedCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Cálculos consolidados
  const totalLimit = useMemo(
    () => cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0),
    [cards]
  );
  const totalUsed = useMemo(
    () => cards.reduce((sum, c) => sum + Number(c.used_limit || 0), 0),
    [cards]
  );
  const totalAvailable = Math.max(0, totalLimit - totalUsed);
  const totalCurrentInvoice = useMemo(
    () => cards.reduce((sum, c) => sum + (Number(c.current_invoice) || 0), 0),
    [cards]
  );

  // Status individual de cada cartão
  const cardsWithStatus = useMemo(() => {
    return cards.map((c) => ({
      card: c,
      status: c.invoice_status || getCardInvoiceStatus(c),
    }));
  }, [cards]);

  const activeCardId = selectedCardId || lastSelectedCardId || cards[0]?.id;
  const activeExpandedCard = useMemo(() => {
    return (
      cardsWithStatus.find((item) => item.card.id === activeCardId) ||
      cardsWithStatus[0] ||
      null
    );
  }, [cardsWithStatus, activeCardId]);

  const handleSelectCard = (id: string) => {
    setLastSelectedCardId(id);
    setSelectedCardId(id);
  };

  const handleBackToWallet = () => {
    setSelectedCardId(null);
  };

  // Se não houver cartões cadastrados
  if (cards.length === 0) {
    return (
      <div
        className={`p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between ${className}`}
      >
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Cartão de Crédito
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <CardIcon className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-300">Nenhum cartão</h2>
          <span className="text-xs text-zinc-500 mt-1 block">
            Cadastre um cartão para acompanhar limites e faturas.
          </span>
        </div>
        <Link
          href="/cartoes"
          className="mt-3 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
        >
          Cadastrar cartão <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // Se houver apenas 1 cartão cadastrado
  if (cards.length === 1) {
    const single = cardsWithStatus[0];
    const { card, status } = single;
    return (
      <div
        className={`p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between relative overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: card.color || '#8b5cf6' }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate max-w-[140px]">
              {card.name}
            </span>
          </div>
          <Link
            href="/cartoes"
            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
          >
            Faturas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-2xl font-bold text-purple-300">
              {formatHidden(formatCurrency(card.current_invoice || 0))}
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                status.isOpen
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {status.isOpen
                ? `${status.closingLabel}${status.daysLeftLabel ? ` • ${status.daysLeftLabel}` : ''}`
                : status.dueLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
            <span>
              Usado: <strong className="text-zinc-200">{formatHidden(formatCurrency(card.used_limit))}</strong>
            </span>
            <span>
              Disp: <strong className="text-emerald-400">{formatHidden(formatCurrency(card.available_limit))}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO MULTI-CARTÃO: CARTEIRA INTERATIVA COM TRANSIÇÃO EXPANSIVA
  // =========================================================================
  const expandedLimitPct =
    activeExpandedCard && activeExpandedCard.card.credit_limit > 0
      ? Math.min(
          100,
          Math.round(
            (activeExpandedCard.card.used_limit /
              activeExpandedCard.card.credit_limit) *
              100
          )
        )
      : 0;

  return (
    <div
      className={`relative p-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[300px] flex flex-col justify-between ${className}`}
    >
      {/* CAMADA 1: VISÃO CONSOLIDADA DA CARTEIRA COM PILHA SOBREPOSTA */}
      <div
        className={`transition-all duration-500 ease-out flex flex-col justify-between h-full ${
          selectedCardId
            ? 'opacity-0 scale-95 pointer-events-none -translate-y-3'
            : 'opacity-100 scale-100 pointer-events-auto translate-y-0'
        }`}
      >
        <div>
          {/* Cabeçalho Consolidado */}
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Fatura Atual
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {cards.length} cartões
              </span>
            </div>

            <Link
              href="/cartoes"
              className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
            >
              Faturas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Valor Total Consolidado */}
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-2xl font-black text-purple-300">
              {formatHidden(formatCurrency(totalCurrentInvoice))}
            </h2>
            <span className="text-[11px] text-zinc-400 font-medium">
              Total somado
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 mb-3">
            <span>
              Usado: <strong className="text-zinc-200">{formatHidden(formatCurrency(totalUsed))}</strong>
            </span>
            <span>
              Disp: <strong className="text-emerald-400">{formatHidden(formatCurrency(totalAvailable))}</strong>
            </span>
          </div>

          {/* Pilha de Cartões (Design de Carteira com Sobreposição Real) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Carteira
              </span>
              <span className="text-[10px] text-purple-400 font-medium">
                Toque no cartão para ver detalhes
              </span>
            </div>

            <div className="relative pt-1 pb-1">
              {cardsWithStatus.map(({ card, status }, index) => {
                const isHovered = hoveredCardId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleSelectCard(card.id)}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCard(card.id);
                      }
                    }}
                    className={`group relative p-3 rounded-2xl border border-white/20 transition-all duration-300 cursor-pointer select-none overflow-hidden ${
                      index > 0 ? '-mt-9 sm:-mt-10' : ''
                    } ${
                      isHovered
                        ? '-translate-y-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.6),0_12px_24px_rgba(0,0,0,0.4)]'
                        : 'shadow-[0_-3px_12px_rgba(0,0,0,0.4),0_6px_16px_rgba(0,0,0,0.3)]'
                    } active:scale-[0.99]`}
                    style={{
                      zIndex: isHovered ? 40 : index + 1,
                      backgroundColor: card.color || '#8b5cf6',
                      backgroundImage:
                        'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 45%, rgba(0,0,0,0.25) 100%)',
                    }}
                  >
                    {/* Linha Superior (Sempre visível mesmo sobreposto) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Chip dourado estilizado */}
                        <div className="w-5 h-4 rounded bg-amber-300 border border-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                          <div className="w-3.5 h-2.5 border border-amber-600/40 rounded-xs" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white truncate drop-shadow-sm">
                              {card.name}
                            </span>
                            <Wifi className="w-3 h-3 text-white/70 rotate-90 shrink-0" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-extrabold text-xs sm:text-sm text-white drop-shadow-sm block leading-none">
                            {formatHidden(formatCurrency(card.current_invoice || 0))}
                          </span>
                          <span className="text-[9px] font-semibold text-white/75 uppercase tracking-wider block mt-0.5">
                            Fatura
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                            status.isOpen
                              ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/40'
                              : 'bg-amber-500/25 text-amber-100 border-amber-400/40'
                          }`}
                        >
                          {status.isOpen ? 'Aberta' : 'Fechada'}
                        </span>
                      </div>
                    </div>

                    {/* Linha Inferior (Vencimento/Fechamento e Limite Disponível) */}
                    <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-white/85">
                      <span className="truncate">
                        {status.isOpen ? status.closingLabel : status.dueLabel}
                      </span>
                      <span className="text-white/90 text-[10px] font-medium">
                        Disp: {formatHidden(formatCurrency(card.available_limit))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CAMADA 2: O CARTÃO SELECIONADO PREENCHENDO TODO O CARD COM ANIMAÇÃO */}
      {activeExpandedCard && (
        <div
          className={`absolute inset-0 p-5 rounded-2xl flex flex-col justify-between transition-all duration-500 ease-out overflow-hidden ${
            selectedCardId
              ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
              : 'opacity-0 scale-95 pointer-events-none translate-y-6'
          }`}
          style={{
            backgroundColor: activeExpandedCard.card.color || '#8b5cf6',
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 45%, rgba(0,0,0,0.32) 100%)',
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,0.35), 0 14px 34px rgba(0,0,0,0.5)',
          }}
        >
          {/* Topo do Cartão Expandido */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <button
                type="button"
                onClick={handleBackToWallet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/50 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/15 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ver carteira</span>
              </button>

              {/* Seletor Rápido de Cartões em Modo Expandido */}
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCard(c.id)}
                    title={c.name}
                    className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                      c.id === activeExpandedCard.card.id
                        ? 'ring-2 ring-white scale-125 shadow-md'
                        : 'opacity-40 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color || '#8b5cf6' }}
                  />
                ))}
              </div>

              <Link
                href="/cartoes"
                className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full bg-black/30 hover:bg-black/45 text-white/95 text-xs font-semibold backdrop-blur-md transition-all border border-white/15"
              >
                <span>Faturas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Identificação do Cartão */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-5 rounded bg-amber-300 border border-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                  <div className="w-4 h-3.5 border border-amber-600/40 rounded-xs flex items-center justify-center">
                    <div className="w-2 h-full border-x border-amber-600/30" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wide truncate drop-shadow-sm">
                      {activeExpandedCard.card.name}
                    </h3>
                    <Wifi className="w-3.5 h-3.5 text-white/80 rotate-90 shrink-0" />
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border drop-shadow-sm shrink-0 ${
                  activeExpandedCard.status.isOpen
                    ? 'bg-emerald-500/30 text-emerald-100 border-emerald-300/40'
                    : 'bg-amber-500/30 text-amber-100 border-amber-300/40'
                }`}
              >
                {activeExpandedCard.status.statusLabel}
              </span>
            </div>

            {/* Valor da Fatura do Cartão */}
            <div className="mt-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/75 block">
                Fatura Atual
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                {formatHidden(formatCurrency(activeExpandedCard.card.current_invoice || 0))}
              </div>
            </div>

            {/* Datas de Fechamento e Vencimento */}
            <div className="mt-2.5 py-1.5 px-3 rounded-xl bg-black/25 backdrop-blur-xs border border-white/10 flex items-center justify-between text-[11px] text-white/90">
              <span className="flex items-center gap-1.5 text-white/85">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                {activeExpandedCard.status.closingLabel}
              </span>
              <span className="font-semibold text-white">
                {activeExpandedCard.status.dueLabel}
              </span>
            </div>
          </div>

          {/* Barra de Limite e Totais do Cartão */}
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-[11px] text-white/90 font-medium">
              <span>
                Usado: <strong>{formatHidden(formatCurrency(activeExpandedCard.card.used_limit))}</strong>
              </span>
              <span>
                Disp: <strong className="text-emerald-300">{formatHidden(formatCurrency(activeExpandedCard.card.available_limit))}</strong>
              </span>
            </div>
            <div className="w-full h-2 bg-black/35 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  expandedLimitPct > 85 ? 'bg-rose-400' : 'bg-emerald-300'
                }`}
                style={{ width: `${expandedLimitPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
