'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DateProvider } from '@/context/DateContext';
import { MobileNavigationProvider, useMobileNavigation, MobileContextMode } from '@/context/MobileNavigationContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { BusinessProfile } from '@/types/database';
import { BusinessProfileProvider } from '@/context/BusinessProfileContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { MobileBackButton } from './MobileBackButton';
import { MobilePullToRefresh } from './MobilePullToRefresh';

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
const OnboardingModal = dynamic(
  () => import('@/components/onboarding/OnboardingModal').then((m) => m.OnboardingModal),
  { ssr: false }
);

interface AppShellProps {
  userEmail?: string;
  initialProfile: BusinessProfile;
  initialContextMode?: MobileContextMode;
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

export function AppShell({ userEmail, initialProfile, initialContextMode, children }: AppShellProps) {
  return (
    <BusinessProfileProvider initialProfile={initialProfile}>
      <DateProvider key={userEmail || 'anonymous'}>
        <MobileNavigationProvider initialContextMode={initialContextMode}>
          <SidebarProvider>
            <div className="min-h-screen flex bg-[#080B11] text-[#F8FAFC]">
              {/* 1. Sidebar Fixa Desktop (232px) */}
              <AppSidebar userEmail={userEmail} />

              {/* 2. Área Principal com início logo após a sidebar (md:pl-[232px]) */}
              <div className="flex-1 flex flex-col min-w-0 md:pl-[232px]">
                <AppHeader userEmail={userEmail} />

                <main className="flex-1 w-full px-4 pt-3 pb-24 md:px-[26px] md:pt-[32px] md:pb-[24px] min-w-0">
                  <MobilePullToRefresh>
                    <div className="w-full mx-auto min-w-0">
                      <MobileBackButton />
                      {children}
                    </div>
                  </MobilePullToRefresh>
                </main>
              </div>

              {/* 3. Navegação e Drawers Mobile preservados 100% */}
              <BottomNav />
              <AppShellDrawers />
              <OnboardingModal />
            </div>
          </SidebarProvider>
        </MobileNavigationProvider>
      </DateProvider>
    </BusinessProfileProvider>
  );
}
