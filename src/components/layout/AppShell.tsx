'use client';

import React from 'react';
import { DateProvider } from '@/context/DateContext';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  userEmail?: string;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <DateProvider>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar userEmail={userEmail} />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 md:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </DateProvider>
  );
}

