'use client';

import React from 'react';
import {
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDateContext } from '@/context/DateContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

export function MobileHeader() {
  const { formattedMonth, prevMonth, nextMonth, month, year, setMonthYear } = useDateContext();
  const { activeTab, contextMode, setContextMode, showValues, setShowValues } = useMobileNavigation();
  const { profile, businessName, hasBusiness } = useBusinessProfile();

  const isHome = activeTab === 'home';

  // Se o usuário não tem negócio ativo, fixa o modo de contexto em 'personal'
  React.useEffect(() => {
    if (!hasBusiness && contextMode !== 'personal') {
      setContextMode('personal');
    }
  }, [hasBusiness, contextMode, setContextMode]);

  // Na aba Início, garante que o mês seja rigorosamente o mês atual
  React.useEffect(() => {
    if (isHome) {
      const now = new Date();
      if (month !== now.getMonth() || year !== now.getFullYear()) {
        setMonthYear(now.getMonth(), now.getFullYear());
      }
    }
  }, [isHome, month, year, setMonthYear]);

  // Na aba "Mais" e na aba "Resumo" (que tem seu próprio seletor único no topo), o cabeçalho padrão não é renderizado
  if (activeTab === 'more' || activeTab === 'summary') return null;

  return (
    <div className={`pt-1 ${isHome ? 'pb-2' : 'space-y-3 pb-3'}`}>
      {/* Seletor Negócio vs Pessoal: SOMENTE na aba Início */}
      {isHome && (
        <div className="flex items-center justify-between gap-2">
          {/* Toggle Negócio vs Pessoal (Apenas se hasBusiness for true) */}
          {hasBusiness ? (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl shadow-sm max-w-[240px]">
              <button
                type="button"
                onClick={() => setContextMode('business')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 truncate ${
                  contextMode === 'business'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span className="truncate">{businessName}</span>
              </button>
              <button
                type="button"
                onClick={() => setContextMode('personal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                  contextMode === 'personal'
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pessoal</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
                Finanças Pessoais
              </span>
            </div>
          )}

          {/* Ações da Direita: Notificações & Privacidade */}
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setShowValues((prev) => !prev)}
              className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-200 transition active:scale-95"
              aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
              title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
            >
              {showValues ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Linha do Seletor de Mês/Ano: exibido apenas no Extrato (no Início fica fixo no mês atual) */}
      {!isHome && (
        <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-2xl">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
            {formattedMonth}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
