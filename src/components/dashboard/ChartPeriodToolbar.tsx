'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekMeta } from '@/lib/actions/dashboard';

export type ChartViewPeriod = 'weekly' | 'monthly' | 'yearly';

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_FULL_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export interface ChartPeriodDataShape<S> {
  yearlyStats?: S[];
  monthlyStats?: S[];
  weeklyStatsByWeek?: Record<number, S[]>;
  weeksMeta?: WeekMeta[];
  defaultWeekIndex?: number;
}

export function useIndependentChartPeriod<T extends ChartPeriodDataShape<S>, S>(
  baseYear: number,
  baseMonth: number,
  baseData: T | undefined,
  fallbackYearlyStats: S[],
  fetcher: (year: number, month: number) => Promise<T>,
  initialPeriod: ChartViewPeriod = 'yearly'
) {
  const parentKey = `${baseYear}-${baseMonth}`;
  const [period, setPeriod] = useState<ChartViewPeriod>(initialPeriod);
  const [overrideState, setOverrideState] = useState<{
    parentKey: string;
    year: number;
    month: number;
    weekIndex: number | null;
    data: T | null;
    loading: boolean;
  } | null>(null);

  const activeOverride =
    overrideState && overrideState.parentKey === parentKey ? overrideState : null;

  const year = activeOverride ? activeOverride.year : baseYear;
  const month = activeOverride ? activeOverride.month : baseMonth;
  const loading = activeOverride ? activeOverride.loading : false;
  const activeData =
    activeOverride && activeOverride.data !== null ? activeOverride.data : baseData;

  const weeksMeta = activeData?.weeksMeta || [];
  const defaultWeekIndex = activeData?.defaultWeekIndex ?? 0;

  const selectedWeekIndex =
    activeOverride &&
    activeOverride.weekIndex !== null &&
    activeOverride.weekIndex < weeksMeta.length
      ? activeOverride.weekIndex
      : defaultWeekIndex;

  const activeStats: S[] = useMemo(() => {
    if (!activeData) {
      return fallbackYearlyStats;
    }

    if (period === 'yearly') {
      return activeData.yearlyStats || fallbackYearlyStats;
    }

    if (period === 'monthly') {
      return activeData.monthlyStats || [];
    }

    const weekDays = activeData.weeklyStatsByWeek?.[selectedWeekIndex];
    if (weekDays && weekDays.length > 0) {
      return weekDays;
    }

    const firstAvailable = Object.values(activeData.weeklyStatsByWeek || {})[0];
    return firstAvailable || activeData.monthlyStats || [];
  }, [activeData, fallbackYearlyStats, period, selectedWeekIndex]);

  const activeWeekMeta = weeksMeta[selectedWeekIndex];

  const subtitle = useMemo(() => {
    if (period === 'yearly') {
      return `Visão anual consolidada de ${year} pelos 12 meses`;
    }
    const formattedMonthLabel = `${MONTH_FULL_NAMES[month]} de ${year}`;
    if (period === 'monthly') {
      return `Visão mensal de ${formattedMonthLabel} com as semanas (Dom a Sáb)`;
    }
    return `Visão semanal de ${MONTH_SHORT_NAMES[month]}/${year} (${
      activeWeekMeta?.shortLabel || 'Dom a Sáb'
    })`;
  }, [period, year, month, activeWeekMeta]);

  const triggerFetch = (nextYear: number, nextMonth: number) => {
    if (nextYear === baseYear && nextMonth === baseMonth) {
      setOverrideState(null);
      return;
    }

    setOverrideState({
      parentKey,
      year: nextYear,
      month: nextMonth,
      weekIndex: null,
      data: activeOverride?.data ?? null,
      loading: true,
    });

    fetcher(nextYear, nextMonth)
      .then((res) => {
        setOverrideState((prev) => {
          if (
            !prev ||
            prev.parentKey !== parentKey ||
            prev.year !== nextYear ||
            prev.month !== nextMonth
          ) {
            return prev;
          }
          return {
            ...prev,
            data: res,
            loading: false,
          };
        });
      })
      .catch((err) => {
        console.error('Erro ao buscar dados do período do gráfico:', err);
        setOverrideState((prev) => (prev ? { ...prev, loading: false } : null));
      });
  };

  const handleYearChange = (nextYear: number) => {
    triggerFetch(nextYear, month);
  };

  const handleMonthChange = (nextMonth: number, nextYear: number) => {
    triggerFetch(nextYear, nextMonth);
  };

  const handleWeekChange = (nextWeekIndex: number) => {
    setOverrideState({
      parentKey,
      year,
      month,
      weekIndex: nextWeekIndex,
      data: activeOverride?.data ?? null,
      loading,
    });
  };

  return {
    period,
    setPeriod,
    year,
    month,
    weeksMeta,
    selectedWeekIndex,
    activeStats,
    subtitle,
    loading,
    handleYearChange,
    handleMonthChange,
    handleWeekChange,
  };
}

interface ChartPeriodToolbarProps {
  period: ChartViewPeriod;
  onPeriodChange: (period: ChartViewPeriod) => void;
  year: number;
  month: number;
  onYearChange: (nextYear: number) => void;
  onMonthChange: (nextMonth: number, nextYear: number) => void;
  weeksMeta?: WeekMeta[];
  selectedWeekIndex?: number;
  onWeekChange?: (nextWeekIndex: number) => void;
  loading?: boolean;
}

export function ChartPeriodToolbar({
  period,
  onPeriodChange,
  year,
  month,
  onYearChange,
  onMonthChange,
  weeksMeta = [],
  selectedWeekIndex = 0,
  onWeekChange,
  loading = false,
}: ChartPeriodToolbarProps) {
  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(11, year - 1);
    } else {
      onMonthChange(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(0, year + 1);
    } else {
      onMonthChange(month + 1, year);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${
        loading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* 1. Seletor Contextual de Referência (Ano, Mês ou Mês + Semana) */}
      {period === 'yearly' && (
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-1.5 py-0.5 text-xs">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Ano anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-bold text-zinc-200 px-2 select-none">
            {year}
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Próximo ano"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {(period === 'monthly' || period === 'weekly') && (
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-1 py-0.5 text-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value), year)}
            className="bg-transparent text-zinc-200 font-semibold text-xs px-1 py-0.5 focus:outline-none cursor-pointer"
            title="Selecionar mês de referência"
          >
            {MONTH_SHORT_NAMES.map((mName, idx) => (
              <option
                key={mName}
                value={idx}
                className="bg-zinc-900 text-zinc-100"
              >
                {mName}/{year}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Próximo mês"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {period === 'weekly' && weeksMeta.length > 0 && onWeekChange && (
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-1 py-0.5 text-xs">
          <button
            type="button"
            disabled={selectedWeekIndex <= 0}
            onClick={() => onWeekChange(Math.max(0, selectedWeekIndex - 1))}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
            title="Semana anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <select
            value={selectedWeekIndex}
            onChange={(e) => onWeekChange(Number(e.target.value))}
            className="bg-transparent text-zinc-200 font-semibold text-xs px-1 py-0.5 focus:outline-none cursor-pointer"
            title="Selecionar semana do mês"
          >
            {weeksMeta.map((w, idx) => (
              <option
                key={w.index}
                value={idx}
                className="bg-zinc-900 text-zinc-100"
              >
                Sem {idx + 1} ({w.shortLabel})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={selectedWeekIndex >= weeksMeta.length - 1}
            onClick={() =>
              onWeekChange(Math.min(weeksMeta.length - 1, selectedWeekIndex + 1))
            }
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
            title="Próxima semana"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Pílulas de Modo de Visualização (Semanal | Mensal | Anual) */}
      <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 text-xs">
        <button
          type="button"
          onClick={() => onPeriodChange('weekly')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            period === 'weekly'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Semanal
        </button>
        <button
          type="button"
          onClick={() => onPeriodChange('monthly')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            period === 'monthly'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onPeriodChange('yearly')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            period === 'yearly'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Anual
        </button>
      </div>
    </div>
  );
}
