'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Transaction } from '@/types/database';
import { GeneralDashboardData, MonthlyGeneralStat } from '@/lib/actions/dashboard';
import { GeneralDashboardDesktop } from './desktop/GeneralDashboardDesktop';
import { GeneralDashboardMobile } from './mobile/GeneralDashboardMobile';

export interface GeneralDashboardViewProps {
  generalData?: GeneralDashboardData;
  yearlyStats?: MonthlyGeneralStat[];
  upcomingBills?: Transaction[];
  onBillPaid?: (billId: string) => void;
  pendingReceipts?: Transaction[];
  onReceiptConfirmed?: (receiptId: string) => void;
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  cards: CreditCardWithUsage[];
  formattedMonth: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
}

export function GeneralDashboardView(props: GeneralDashboardViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <GeneralDashboardMobile {...props} />;
  }

  return <GeneralDashboardDesktop {...props} />;
}
