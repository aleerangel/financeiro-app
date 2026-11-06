'use client';

import React from 'react';
import { Sparkles, ArrowRight, CalendarCheck } from 'lucide-react';
import { getMonthName } from '@/lib/monthly-wrapped-utils';

interface MonthlyWrappedBannerProps {
  month: number;
  year: number;
  onOpenWrapped: () => void;
}

export function MonthlyWrappedBanner({
  month,
  year,
  onOpenWrapped,
}: MonthlyWrappedBannerProps) {
  const monthName = getMonthName(month);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-indigo-600/15 border border-violet-500/25 p-4 sm:p-5 shadow-sm transition-all hover:border-violet-500/40">
      {/* Elementos decorativos de fundo */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-24 h-24 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
                Retrospectiva Fechada
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 inline" /> {monthName} de {year}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
              Como foi seu mês de {monthName}? ✨
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Veja seus maiores feitos, onde sua grana foi e o veredito final em formato interativo.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWrapped}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-md shadow-violet-600/20 hover:shadow-violet-600/30 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <span>Ver Retrospectiva</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
