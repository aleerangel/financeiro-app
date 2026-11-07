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

  const selectedCardItem = useMemo(() => {
    if (!selectedCardId) return null;
    return cardsWithStatus.find((item) => item.card.id === selectedCardId) || null;
  }, [cardsWithStatus, selectedCardId]);

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
  // CASO MULTI-CARTÃO: CARTEIRA INTERATIVA (WALLET STYLE)
  // =========================================================================

  // MODO 1: Foco em um cartão específico selecionado (In-Place)
  if (selectedCardItem) {
    const { card, status } = selectedCardItem;
    const limitPct =
      card.credit_limit > 0
        ? Math.min(100, Math.round((card.used_limit / card.credit_limit) * 100))
        : 0;

    return (
      <div
        className={`p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between transition-all duration-300 ${className}`}
        style={{
          boxShadow: `0 8px 24px -6px ${card.color || '#8b5cf6'}22`,
        }}
      >
        {/* Cabeçalho do Cartão Focado */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSelectedCardId(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver carteira</span>
            </button>

            {/* Alternador Rápido entre cartões */}
            <div className="flex items-center gap-1">
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCardId(c.id)}
                  title={c.name}
                  className={`w-5 h-5 rounded-md transition-all cursor-pointer ${
                    c.id === card.id
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-40 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color || '#8b5cf6' }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: card.color || '#8b5cf6' }}
              />
              <h3 className="text-sm font-bold text-zinc-100 truncate">
                {card.name}
              </h3>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                status.isOpen
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {status.statusLabel}
            </span>
          </div>

          {/* Valor da Fatura do Cartão */}
          <div className="mt-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Fatura Atual
            </span>
            <div className="text-2xl font-black text-purple-300">
              {formatHidden(formatCurrency(card.current_invoice || 0))}
            </div>
          </div>

          {/* Datas de Fechamento e Vencimento */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-300">
            <span className="flex items-center gap-1 text-zinc-400">
              <Calendar className="w-3 h-3 text-emerald-400" />
              {status.closingLabel}
            </span>
            <span className="font-semibold text-zinc-200">
              {status.dueLabel}
            </span>
          </div>

          {/* Barra de Limite do Cartão */}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Usado: {formatHidden(formatCurrency(card.used_limit))}</span>
              <span>Disp: {formatHidden(formatCurrency(card.available_limit))}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  limitPct > 85 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${limitPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rodapé: Link para faturas deste cartão */}
        <div className="mt-3 pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={() => setSelectedCardId(null)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
          >
            ← Voltar
          </button>
          <Link
            href="/cartoes"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
          >
            Ver faturas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // MODO 2: Carteira Consolidada com cartões sobrepostos (Wallet Style)
  return (
    <div
      className={`p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between ${className}`}
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
                  onClick={() => setSelectedCardId(card.id)}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCardId(card.id);
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
  );
}
