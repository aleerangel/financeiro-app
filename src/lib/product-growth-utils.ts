import { getZonedParts, isCurrentMonth } from './date-utils';

/**
 * Calcula a variação percentual de crescimento de vendas de um produto.
 * - Se vendeu no mês anterior: ((atual - anterior) / anterior) * 100
 * - Se não vendeu no anterior mas vendeu no atual: 100%
 * - Se não vendeu em nenhum: 0%
 */
export function calculateProductGrowth(currentCount: number, prevCount: number): number {
  if (prevCount > 0) {
    return Math.round(((currentCount - prevCount) / prevCount) * 100);
  }
  if (currentCount > 0) {
    return 100;
  }
  return 0;
}

/**
 * Retorna o dia limite (cutoff day) para comparação justa do mês anterior:
 * - Se o mês selecionado for o mês atual em andamento (ex: hoje é dia 04/11),
 *   retorna o dia atual (4), garantindo que o mês anterior (outubro) só conte até o dia 4 (01/10 a 04/10).
 * - Se for um mês encerrado (ex: outubro analisado em novembro), retorna 31 para considerar o mês fechado completo.
 */
export function getProductGrowthCutoffDay(
  year: number,
  month: number,
  now: Date = new Date()
): number {
  if (isCurrentMonth(month, year, now)) {
    const parts = getZonedParts(now);
    return parts.day;
  }
  return 31;
}

