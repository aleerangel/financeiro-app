'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DateProvider } from '@/context/DateContext';
import { MobileNavigationProvider, useMobileNavigation } from '@/context/MobileNavigationContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
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
        <SidebarProvider>
          <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
            {/* 1. Sidebar Fixa Desktop */}
            <AppSidebar userEmail={userEmail} />

            {/* 2. Área Principal com Header e Conteúdo Full-Width */}
            <div className="flex-1 flex flex-col min-w-0">
              <AppHeader userEmail={userEmail} />

              <main className="flex-1 w-full px-4 pt-3 pb-24 md:px-8 md:py-8 md:pb-12 min-w-0">
                <MobileBackButton />
                {children}
              </main>
            </div>

            {/* 3. Navegação e Drawers Mobile preservados 100% */}
            <BottomNav />
            <AppShellDrawers />
          </div>
        </SidebarProvider>
      </MobileNavigationProvider>
    </DateProvider>
  );
}
