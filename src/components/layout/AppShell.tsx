'use client';

import React from 'react';
import { DateProvider } from '@/context/DateContext';
import { MobileNavigationProvider } from '@/context/MobileNavigationContext';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { QuickActionDrawer } from './QuickActionDrawer';
import { MobileQuickTransactionModal } from './MobileQuickTransactionModal';
import { MobileNewSaleDrawer } from './MobileNewSaleDrawer';

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
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 md:pb-10">
            {children}
          </main>
          <BottomNav />
          <QuickActionDrawer />
          <MobileQuickTransactionModal />
          <MobileNewSaleDrawer />
        </div>
      </MobileNavigationProvider>
    </DateProvider>
  );
}

