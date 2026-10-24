import React from 'react';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

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

  return (
    <AppShell userEmail={user.email}>
      {children}
    </AppShell>
  );
}
