'use client';

import React, { createContext, useContext, useState } from 'react';

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
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

const STORAGE_KEY_CONTEXT_MODE = 'financeiro_mobile_context_mode';
const STORAGE_KEY_SHOW_VALUES = 'financeiro_mobile_show_values';

export function MobileNavigationProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [contextMode, setContextModeState] = useState<MobileContextMode>(() => {
    if (typeof window === 'undefined') return 'business';
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_CONTEXT_MODE);
      if (savedMode === 'business' || savedMode === 'personal') {
        return savedMode;
      }
    } catch {
      // Ignora erro de storage restrito
    }
    return 'business';
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
  const [newTransactionModal, setNewTransactionModal] = useState<NewTransactionModalState>({
    open: false,
    type: 'expense',
    scope: 'personal',
  });

  const setContextMode = (mode: MobileContextMode) => {
    setContextModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_CONTEXT_MODE, mode);
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
