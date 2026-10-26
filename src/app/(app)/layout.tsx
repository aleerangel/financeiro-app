import React from 'react';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getBusinessProfile } from '@/lib/actions/business-profile';
import { MobileContextMode } from '@/context/MobileNavigationContext';

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const [businessProfile, cookieStore] = await Promise.all([
    getBusinessProfile(),
    cookies(),
  ]);

  const rawCookieMode = cookieStore.get('financeiro_context_mode')?.value;
  const initialContextMode: MobileContextMode =
    businessProfile.has_business
      ? (rawCookieMode === 'business' || rawCookieMode === 'personal' ? rawCookieMode : 'business')
      : 'personal';

  return (
    <AppShell
      userEmail={user.email}
      initialProfile={businessProfile}
      initialContextMode={initialContextMode}
    >
      {children}
    </AppShell>
  );
}
