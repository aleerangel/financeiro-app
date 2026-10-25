'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { BusinessDashboardData } from '@/lib/actions/dashboard';
import { BusinessDashboardDesktop } from './desktop/BusinessDashboardDesktop';
import { BusinessDashboardMobile } from './mobile/BusinessDashboardMobile';

export interface BusinessDashboardViewProps {
  data: BusinessDashboardData;
  accounts: AccountWithBalance[];
  formattedMonth?: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
  onAddBusinessExpense?: () => void;
}

export function BusinessDashboardView(props: BusinessDashboardViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <BusinessDashboardMobile {...props} />;
  }

  return <BusinessDashboardDesktop {...props} />;
}
