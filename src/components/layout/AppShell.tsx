'use client';

import React from 'react';
import { DateProvider } from '@/context/DateContext';
import { MobileNavigationProvider } from '@/context/MobileNavigationContext';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { QuickActionDrawer } from './QuickActionDrawer';
import { MobileQuickTransactionModal } from './MobileQuickTransactionModal';
import { MobileNewSaleDrawer } from './MobileNewSaleDrawer';
import { MobileYieldCorrectionModal } from './MobileYieldCorrectionModal';
import { MobileBackButton } from './MobileBackButton';

interface AppShellProps {
  userEmail?: string;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <DateProvider key={userEmail || 'anonymous'}>
      <MobileNavigationProvider>
        <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
          <Navbar userEmail={userEmail} />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-3 pb-24 md:py-6 md:pb-10">
            <MobileBackButton />
            {children}
          </main>
          <BottomNav />
          <QuickActionDrawer />
          <MobileQuickTransactionModal />
          <MobileNewSaleDrawer />
          <MobileYieldCorrectionModal />
        </div>
      </MobileNavigationProvider>
    </DateProvider>
  );
}

