'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

interface DateContextType {
  currentDate: Date;
  month: number; // 0 a 11
  year: number;
  formattedMonth: string; // Ex: "Outubro de 2026"
  nextMonth: () => void;
  prevMonth: () => void;
  setMonthYear: (month: number, year: number) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const formattedMonth = useMemo(() => {
    return `${MONTH_NAMES[month]} de ${year}`;
  }, [month, year]);

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next;
    });
  };

  const prevMonth = () => {
    setCurrentDate((prev) => {
      const previous = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return previous;
    });
  };

  const setMonthYear = (newMonth: number, newYear: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
  };

  return (
    <DateContext.Provider
      value={{
        currentDate,
        month,
        year,
        formattedMonth,
        nextMonth,
        prevMonth,
        setMonthYear,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext() {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useDateContext deve ser utilizado dentro de um DateProvider');
  }
  return context;
}

