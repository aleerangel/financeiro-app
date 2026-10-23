'use client';

import React from 'react';
import {
  Scissors,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDateContext } from '@/context/DateContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

export function MobileHeader() {
  const { formattedMonth, prevMonth, nextMonth } = useDateContext();
  const { activeTab, contextMode, setContextMode, showValues, setShowValues } = useMobileNavigation();

  // Na aba "Mais", o seletor de mês e contexto não são necessários
  if (activeTab === 'more') return null;

  const isHome = activeTab === 'home';

  return (
    <div className="space-y-3 pt-1 pb-3">
      {/* Seletor Barbearia vs Pessoal: SOMENTE na aba Início */}
      {isHome && (
        <div className="flex items-center justify-between gap-2">
          {/* Toggle Barbearia vs Pessoal */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setContextMode('business')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                contextMode === 'business'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Barbearia</span>
            </button>
            <button
              type="button"
              onClick={() => setContextMode('personal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                contextMode === 'personal'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Pessoal</span>
            </button>
          </div>

          {/* Botão de Privacidade */}
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
      )}

      {/* Linha do Seletor de Mês/Ano estilizado touch */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-2xl">
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

        {/* Nas abas Extrato e Resumo, o botão de privacidade fica inline ao lado do seletor de mês */}
        {!isHome && (
          <button
            type="button"
            onClick={() => setShowValues((prev) => !prev)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-200 transition active:scale-95 shrink-0"
            aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
            title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
