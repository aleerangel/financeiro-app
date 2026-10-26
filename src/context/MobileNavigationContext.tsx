'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { PaymentMethod, FinancialScope } from '@/types/database';

export type MobileTab = 'home' | 'statement' | 'summary' | 'more';
export type MobileContextMode = 'business' | 'personal';
export type MobileMoreModule =
  | 'clients'
  | 'products'
  | 'accounts'
  | 'cards'
  | 'recurrences'
  | 'categories'
  | null;

export interface NewTransactionModalState {
  open: boolean;
  type: 'income' | 'expense';
  scope: 'personal' | 'business';
}

export interface OptimisticTransactionData {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  scope: FinancialScope;
  payment_method: PaymentMethod;
  transaction_date: string;
  due_date: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  total_installments?: number;
  is_paid: boolean;
}

export interface OptimisticSaleData {
  totalAmount: number;
  paymentMethod: string;
  accountId?: string | null;
  clientName: string;
  itemsCount: number;
  isCredit: boolean;
}

export interface OptimisticMutation {
  type: 'transaction' | 'sale' | 'yield' | 'refresh';
  transaction?: OptimisticTransactionData;
  sale?: OptimisticSaleData;
  timestamp: number;
}

interface MobileNavigationContextType {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  contextMode: MobileContextMode;
  setContextMode: (mode: MobileContextMode) => void;
  showValues: boolean;
  setShowValues: (show: boolean | ((prev: boolean) => boolean)) => void;
  quickActionOpen: boolean;
  setQuickActionOpen: (open: boolean) => void;
  activeMoreModule: MobileMoreModule;
  setActiveMoreModule: (module: MobileMoreModule) => void;
  newSaleOpen: boolean;
  setNewSaleOpen: (open: boolean) => void;
  newTransactionModal: NewTransactionModalState;
  setNewTransactionModal: (state: NewTransactionModalState) => void;
  openQuickTransaction: (type: 'income' | 'expense', scope: 'personal' | 'business') => void;
  yieldModalOpen: boolean;
  setYieldModalOpen: (open: boolean) => void;
  openYieldCorrection: () => void;
  lastMutation: OptimisticMutation | null;
  notifyMutation: (mutation: Omit<OptimisticMutation, 'timestamp'>) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

const STORAGE_KEY_CONTEXT_MODE = 'financeiro_mobile_context_mode';
const STORAGE_KEY_SHOW_VALUES = 'financeiro_mobile_show_values';

export function MobileNavigationProvider({
  initialContextMode = 'business',
  children,
}: {
  initialContextMode?: MobileContextMode;
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [contextMode, setContextModeState] = useState<MobileContextMode>(() => {
    if (typeof window === 'undefined') return initialContextMode;
    try {
      const match = document.cookie.match(/(?:^|; )financeiro_context_mode=([^;]*)/);
      if (match && (match[1] === 'business' || match[1] === 'personal')) {
        return match[1] as MobileContextMode;
      }
      // Se não há cookie explícito, prioriza initialContextMode do servidor e sincroniza storage
      localStorage.setItem(STORAGE_KEY_CONTEXT_MODE, initialContextMode);
    } catch {
      // Ignora erro de storage restrito
    }
    return initialContextMode;
  });

  const [showValues, setShowValuesState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const savedShowValues = localStorage.getItem(STORAGE_KEY_SHOW_VALUES);
      if (savedShowValues !== null) {
        return savedShowValues === 'true';
      }
    } catch {
      // Ignora erro de storage restrito
    }
    return true;
  });

  const [quickActionOpen, setQuickActionOpen] = useState<boolean>(false);
  const [activeMoreModule, setActiveMoreModule] = useState<MobileMoreModule>(null);
  const [newSaleOpen, setNewSaleOpen] = useState<boolean>(false);
  const [yieldModalOpen, setYieldModalOpen] = useState<boolean>(false);
  const [newTransactionModal, setNewTransactionModal] = useState<NewTransactionModalState>({
    open: false,
    type: 'expense',
    scope: 'personal',
  });
  const [lastMutation, setLastMutation] = useState<OptimisticMutation | null>(null);

  const notifyMutation = useCallback((mutation: Omit<OptimisticMutation, 'timestamp'>) => {
    const fullMutation: OptimisticMutation = {
      ...mutation,
      timestamp: Date.now(),
    };
    setLastMutation(fullMutation);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeiro:mutation', { detail: fullMutation })
      );
    }
  }, []);

  const setContextMode = (mode: MobileContextMode) => {
    setContextModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_CONTEXT_MODE, mode);
      document.cookie = `financeiro_context_mode=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignora
    }
  };

  const setShowValues = (showOrFn: boolean | ((prev: boolean) => boolean)) => {
    setShowValuesState((prev) => {
      const next = typeof showOrFn === 'function' ? showOrFn(prev) : showOrFn;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_VALUES, String(next));
      } catch {
        // Ignora
      }
      return next;
    });
  };

  const openQuickTransaction = (type: 'income' | 'expense', scope: 'personal' | 'business') => {
    setQuickActionOpen(false);
    setNewTransactionModal({
      open: true,
      type,
      scope,
    });
  };

  const openYieldCorrection = () => {
    setQuickActionOpen(false);
    setYieldModalOpen(true);
  };

  return (
    <MobileNavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        contextMode,
        setContextMode,
        showValues,
        setShowValues,
        quickActionOpen,
        setQuickActionOpen,
        activeMoreModule,
        setActiveMoreModule,
        newSaleOpen,
        setNewSaleOpen,
        newTransactionModal,
        setNewTransactionModal,
        openQuickTransaction,
        yieldModalOpen,
        setYieldModalOpen,
        openYieldCorrection,
        lastMutation,
        notifyMutation,
      }}
    >
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error('useMobileNavigation must be used within a MobileNavigationProvider');
  }
  return context;
}

export function useOptionalMobileNavigation() {
  return useContext(MobileNavigationContext) || null;
}
