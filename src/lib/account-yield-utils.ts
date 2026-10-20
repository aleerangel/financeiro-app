import { Account, AccountYieldType, Transaction } from '@/types/database';

/**
 * Taxa mensal líquida estimada para 100% do CDI (~0.85% a.m. líquido já descontando IR médio).
 */
export const DEFAULT_CDI_NET_MONTHLY_PERCENT = 0.85;

export const YIELD_TAG = '[Rendimento]';

const AUTO_CDI_ACCOUNT_KEYWORDS = [
  'nubank',
  'nuconta',
  'caixinha',
  'mercado pago',
  'picpay',
  'cdb',
  'iti',
  'pagbank',
];

export interface ResolvedYieldConfig {
  yieldType: AccountYieldType;
  yieldRate: number;
  effectiveMonthlyPercent: number;
  label: string | null;
}

/**
 * Resolve a configuração de rendimento da conta (incluindo fallback automático para contas
 * como Nubank / Investimento caso a migração SQL ainda não tenha sido aplicada).
 */
export function resolveAccountYieldConfig(
  account: Pick<Account, 'name' | 'type' | 'yield_type' | 'yield_rate'>
): ResolvedYieldConfig {
  let yieldType: AccountYieldType = account.yield_type || 'none';
  let yieldRate = Number(account.yield_rate) || 0;

  // Fallback inteligente se a coluna ainda não existir ou estiver zerada em contas remuneradas conhecidas
  if (account.yield_type === undefined || (yieldType === 'none' && yieldRate === 0)) {
    const lowerName = (account.name || '').trim().toLowerCase();
    if (
      account.type === 'investment' ||
      AUTO_CDI_ACCOUNT_KEYWORDS.some((kw) => lowerName.includes(kw))
    ) {
      if (account.yield_type === undefined) {
        yieldType = 'cdi_percent';
        yieldRate = 100;
      }
    } else if (account.type === 'savings' && account.yield_type === undefined) {
      yieldType = 'monthly_percent';
      yieldRate = 0.6;
    }
  }

  if (yieldType === 'cdi_percent' && yieldRate > 0) {
    const effectiveMonthlyPercent =
      Math.round((yieldRate / 100) * DEFAULT_CDI_NET_MONTHLY_PERCENT * 1000) / 1000;
    return {
      yieldType,
      yieldRate,
      effectiveMonthlyPercent,
      label: `${yieldRate}% do CDI`,
    };
  }

  if (yieldType === 'monthly_percent' && yieldRate > 0) {
    return {
      yieldType,
      yieldRate,
      effectiveMonthlyPercent: yieldRate,
      label: `${String(yieldRate).replace('.', ',')}% a.m.`,
    };
  }

  return {
    yieldType: 'none',
    yieldRate: 0,
    effectiveMonthlyPercent: 0,
    label: null,
  };
}

/**
 * Calcula a projeção de rendimento para 30 dias e 12 meses (juros compostos) sobre o saldo atual.
 */
export function calculateProjectedYield(
  currentBalance: number,
  effectiveMonthlyPercent: number
): { monthlyEstimate: number; yearlyEstimate: number } {
  if (currentBalance <= 0 || effectiveMonthlyPercent <= 0) {
    return { monthlyEstimate: 0, yearlyEstimate: 0 };
  }

  const monthlyRate = effectiveMonthlyPercent / 100;
  const monthlyEstimate = Math.round(currentBalance * monthlyRate * 100) / 100;
  const yearlyEstimate =
    Math.round(currentBalance * (Math.pow(1 + monthlyRate, 12) - 1) * 100) / 100;

  return { monthlyEstimate, yearlyEstimate };
}

/**
 * Identifica se uma transação é um lançamento de rendimento/juros de conta.
 */
export function isYieldTransaction(
  tx: Pick<Transaction, 'type' | 'description' | 'notes'>
): boolean {
  if (tx.type !== 'income') return false;
  if (tx.notes && tx.notes.includes(YIELD_TAG)) return true;
  const desc = (tx.description || '').trim().toLowerCase();
  return (
    desc.startsWith('rendimento:') ||
    desc.startsWith('rendimento ') ||
    desc.startsWith('juros:')
  );
}

