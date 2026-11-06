'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, LayoutList, Smartphone, Loader2 } from 'lucide-react';
import { getMonthlyWrappedData } from '@/lib/actions/monthly-wrapped';
import { MonthlyWrappedData, getMonthName } from '@/lib/monthly-wrapped-utils';
import { MonthlyWrappedStories } from './MonthlyWrappedStories';
import { MonthlyWrappedSummaryView } from './MonthlyWrappedSummaryView';

interface MonthlyWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: number;
  year: number;
}

export function MonthlyWrappedModal({
  isOpen,
  onClose,
  month,
  year,
}: MonthlyWrappedModalProps) {
  const [mode, setMode] = useState<'stories' | 'list'>('stories');
  const [data, setData] = useState<MonthlyWrappedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedPeriod, setLoadedPeriod] = useState<{ month: number; year: number } | null>(null);

  const isFetching = isOpen && (!loadedPeriod || loadedPeriod.month !== month || loadedPeriod.year !== year);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    getMonthlyWrappedData(month, year)
      .then((res) => {
        if (!isMounted) return;
        if (!res) {
          setError('Não foi possível carregar a retrospectiva deste mês.');
        } else {
          setData(res);
          setError(null);
        }
        setLoadedPeriod({ month, year });
      })
      .catch((err) => {
        console.error('Erro ao carregar retrospectiva:', err);
        if (isMounted) {
          setError('Erro inesperado ao carregar dados da retrospectiva.');
          setLoadedPeriod({ month, year });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, month, year]);

  const loading = isFetching;

  // Fechar no ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthName = getMonthName(month);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Barra Superior */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Retrospectiva {monthName} {year}
              </h2>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Spotify Wrapped financeiro do mês
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor de Modo: Stories vs Lista */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted border border-border text-xs">
              <button
                type="button"
                onClick={() => setMode('stories')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  mode === 'stories'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Modo Stories interativo"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stories</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  mode === 'list'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Modo Lista resumido"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Gerando os insights de {monthName}...
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Analisando suas receitas, despesas, faturas e clientes do mês.
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-3xl">⚠️</div>
              <p className="text-sm font-medium text-foreground">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
              >
                Fechar
              </button>
            </div>
          ) : data ? (
            mode === 'stories' ? (
              <div className="flex justify-center py-2">
                <MonthlyWrappedStories data={data} onFinish={() => setMode('list')} />
              </div>
            ) : (
              <MonthlyWrappedSummaryView data={data} />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
