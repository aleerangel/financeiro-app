import React from 'react';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getBusinessProfile } from '@/lib/actions/business-profile';

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

  const businessProfile = await getBusinessProfile();

  return (
    <AppShell userEmail={user.email} initialProfile={businessProfile}>
      {children}
    </AppShell>
  );
}
