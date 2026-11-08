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
    <div className="relative overflow-hidden rounded-2xl bg-[#0D121F] border border-[#1E293B] hover:border-[#FACC15]/40 p-4 sm:p-5 shadow-sm transition-all duration-300">
      {/* Elementos decorativos de iluminação Canário & Meia-Noite */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#FACC15]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-28 h-28 bg-[#38BDF8]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15] shadow-md shadow-[#FACC15]/10 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30">
                Retrospectiva Fechada
              </span>
              <span className="text-xs text-[#64748B] hidden sm:inline flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 inline text-[#94A3B8]" /> {monthName} de {year}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] mt-0.5">
              Como foi seu mês de {monthName}? ✨
            </h3>
            <p className="text-xs sm:text-sm text-[#94A3B8]">
              Veja seus maiores feitos, onde sua grana foi e o veredito final em formato interativo.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWrapped}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#080B11] bg-[#FACC15] hover:bg-[#FDE047] active:bg-[#EAB308] shadow-md shadow-[#FACC15]/20 hover:shadow-[#FACC15]/30 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <span>Ver Retrospectiva</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
