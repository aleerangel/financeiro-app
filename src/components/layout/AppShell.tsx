'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DateProvider } from '@/context/DateContext';
import { MobileNavigationProvider, useMobileNavigation } from '@/context/MobileNavigationContext';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { MobileBackButton } from './MobileBackButton';

// Carregamento dinâmico dos drawers e modais pesados sob demanda (zero impacto no LCP/TBT inicial)
const QuickActionDrawer = dynamic(
  () => import('./QuickActionDrawer').then((m) => m.QuickActionDrawer),
  { ssr: false }
);
const MobileQuickTransactionModal = dynamic(
  () => import('./MobileQuickTransactionModal').then((m) => m.MobileQuickTransactionModal),
  { ssr: false }
);
const MobileNewSaleDrawer = dynamic(
  () => import('./MobileNewSaleDrawer').then((m) => m.MobileNewSaleDrawer),
  { ssr: false }
);
const MobileYieldCorrectionModal = dynamic(
  () => import('./MobileYieldCorrectionModal').then((m) => m.MobileYieldCorrectionModal),
  { ssr: false }
);

interface AppShellProps {
  userEmail?: string;
  children: React.ReactNode;
}

function AppShellDrawers() {
  const { quickActionOpen, newTransactionModal, newSaleOpen, yieldModalOpen } = useMobileNavigation();

  return (
    <>
      {quickActionOpen && <QuickActionDrawer />}
      {newTransactionModal.open && <MobileQuickTransactionModal />}
      {newSaleOpen && <MobileNewSaleDrawer />}
      {yieldModalOpen && <MobileYieldCorrectionModal />}
    </>
  );
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
          <AppShellDrawers />
        </div>
      </MobileNavigationProvider>
    </DateProvider>
  );
}

