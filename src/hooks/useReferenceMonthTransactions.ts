'use client';

import { useState } from 'react';
import { Transaction } from '@/types/database';
import { getTransactions } from '@/lib/actions/transactions';

export function useReferenceMonthTransactions(
  baseTransactions: Transaction[],
  currentMonth: number,
  year: number
) {
  const parentKey = `${year}-${currentMonth}`;
  const [overrideState, setOverrideState] = useState<{
    parentKey: string;
    month: number;
    year: number;
    transactions: Transaction[] | null;
    loading: boolean;
  } | null>(null);

  const activeOverride =
    overrideState && overrideState.parentKey === parentKey ? overrideState : null;

  const refMonth = activeOverride ? activeOverride.month : currentMonth;
  const refYear = activeOverride ? activeOverride.year : year;
  const loadingCustom = activeOverride ? activeOverride.loading : false;
  const activeTransactions =
    activeOverride && activeOverride.transactions !== null
      ? activeOverride.transactions
      : baseTransactions;

  const selectReferencePeriod = (nextMonth: number, nextYear: number) => {
    if (nextMonth === currentMonth && nextYear === year) {
      setOverrideState(null);
      return;
    }

    setOverrideState({
      parentKey,
      month: nextMonth,
      year: nextYear,
      transactions: activeOverride?.transactions ?? null,
      loading: true,
    });

    getTransactions(nextMonth, nextYear)
      .then((data) => {
        setOverrideState((prev) => {
          if (
            !prev ||
            prev.parentKey !== parentKey ||
            prev.month !== nextMonth ||
            prev.year !== nextYear
          ) {
            return prev;
          }
          return {
            ...prev,
            transactions: data,
            loading: false,
          };
        });
      })
      .catch((err) => {
        console.error('Erro ao buscar transações do mês de referência:', err);
        setOverrideState((prev) =>
          prev ? { ...prev, loading: false } : null
        );
      });
  };

  const handlePrevMonth = () => {
    if (refMonth === 0) {
      selectReferencePeriod(11, refYear - 1);
    } else {
      selectReferencePeriod(refMonth - 1, refYear);
    }
  };

  const handleNextMonth = () => {
    if (refMonth === 11) {
      selectReferencePeriod(0, refYear + 1);
    } else {
      selectReferencePeriod(refMonth + 1, refYear);
    }
  };

  return {
    refMonth,
    refYear,
    loadingCustom,
    activeTransactions,
    selectReferencePeriod,
    handlePrevMonth,
    handleNextMonth,
  };
}

