import { Category, FinancialScope, Recurrence, Transaction } from '@/types/database';

export const BUSINESS_TAG = '[Barbearia]';

const BUSINESS_CATEGORY_KEYWORDS = [
  'barbearia',
  'insumos',
  'descartáveis',
  'descartaveis',
  'lâminas',
  'laminas',
];

/**
 * Determina se uma categoria pertence ao escopo da Barbearia ('business').
 */
export function isBusinessCategory(category?: Partial<Category> | null): boolean {
  if (!category) return false;
  if (category.scope === 'business') return true;
  if (category.scope === 'personal' && category.name) {
    // Ainda verifica palavras-chave padrão caso a coluna scope seja o default 'personal' antes da migração
    const lower = category.name.trim().toLowerCase();
    if (lower === 'barbearia' || lower === 'insumos & barbearia') return true;
    return false;
  }
  const lowerName = (category.name || '').trim().toLowerCase();
  return BUSINESS_CATEGORY_KEYWORDS.some((kw) => lowerName.includes(kw));
}

/**
 * Determina se uma transação pertence à Barbearia ('business').
 */
export function isBusinessTransaction(
  tx: Omit<Partial<Transaction>, 'category'> & { category?: Partial<Category> | null }
): boolean {
  if (tx.scope === 'business') return true;
  if (tx.notes && tx.notes.includes(BUSINESS_TAG)) return true;
  if (tx.description && tx.description.startsWith('Atendimento:')) return true;
  if (tx.category && isBusinessCategory(tx.category)) return true;
  return false;
}

/**
 * Determina se uma transação de receita é um faturamento de atendimento/serviço comercial ('business').
 */
export function isBusinessServiceIncome(
  tx: Omit<Partial<Transaction>, 'category'> & { category?: Partial<Category> | null }
): boolean {
  if (tx.scope === 'business' && tx.type === 'income') return true;
  if (tx.description && (tx.description.startsWith('Atendimento:') || tx.description.startsWith('Venda:') || tx.description.startsWith('Mensalidade:'))) {
    return true;
  }
  if (tx.notes && (tx.notes.includes('Atendimento') || tx.notes.includes('Comanda:') || tx.notes.includes('[escopo:business]'))) {
    return true;
  }
  const lowerCat = (tx.category?.name || '').trim().toLowerCase();
  if (
    lowerCat.includes('barbearia') ||
    lowerCat.includes('serviço') ||
    lowerCat.includes('servico') ||
    lowerCat.includes('atendimento') ||
    lowerCat.includes('consulta') ||
    lowerCat.includes('mão de obra') ||
    lowerCat.includes('mao de obra')
  ) {
    return true;
  }
  return false;
}

export const isBarbeariaServiceIncome = isBusinessServiceIncome;

/**
 * Resolve o nome e a cor padronizados da categoria de uma transação de receita.
 */
export function resolveIncomeCategoryMeta(
  tx: Omit<Partial<Transaction>, 'category'> & { category?: Partial<Category> | null }
): { id: string; name: string; color: string } {
  if (isBusinessServiceIncome(tx)) {
    return {
      id: 'barbearia-servicos',
      name: tx.category?.name || 'Barbearia (Serviços)',
      color: '#10b981',
    };
  }
  return {
    id: tx.category?.id || tx.category?.name?.toLowerCase() || 'outras-receitas',
    name: tx.category?.name || 'Outras Receitas',
    color: tx.category?.color || '#3b82f6',
  };
}

/**
 * Determina se uma conta fixa/recorrência pertence à Barbearia ('business').
 */
export function isBusinessRecurrence(
  rec: Omit<Partial<Recurrence>, 'category'> & { category?: Partial<Category> | null }
): boolean {
  if (rec.scope === 'business') return true;
  if (rec.category && isBusinessCategory(rec.category)) return true;
  return false;
}

/**
 * Garante que a tag [Barbearia] seja anexada ou removida das observações como fallback
 * caso o banco ainda não tenha a coluna `scope`.
 */
export function applyScopeToNotes(
  notes: string | null | undefined,
  scope: FinancialScope
): string | null {
  const clean = stripScopeTagFromNotes(notes);
  if (scope === 'business') {
    return clean ? `${BUSINESS_TAG} ${clean}` : BUSINESS_TAG;
  }
  return clean || null;
}

/**
 * Remove a tag técnica [Barbearia] das observações para exibição limpa na UI.
 */
export function stripScopeTagFromNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes.replace(/\[Barbearia\]\s*/gi, '').trim();
}

export interface ServiceVsProductSplit {
  serviceRevenue: number;
  productRevenue: number;
  servicePercentage: number;
  productPercentage: number;
  serviceCount: number;
  productCount: number;
}

/**
 * Calcula a divisão percentual e volumétrica entre Serviços e Produtos de forma unificada.
 */
export function computeRevenueSplit(
  serviceRevenue: number,
  productRevenue: number,
  serviceCount = 0,
  productCount = 0
): ServiceVsProductSplit {
  const total = serviceRevenue + productRevenue;
  const servicePercentage = total > 0 ? Math.round((serviceRevenue / total) * 100) : 0;
  const productPercentage = total > 0 ? 100 - servicePercentage : 0;

  return {
    serviceRevenue,
    productRevenue,
    servicePercentage,
    productPercentage,
    serviceCount,
    productCount,
  };
}

/**
 * Verifica se o faturamento é misto (possui tanto serviços quanto produtos com valor > 0).
 * Usado para controle dinâmico e consistente nos dashboards e resumos.
 */
export function isMixedRevenueSplit(
  split?: Partial<ServiceVsProductSplit> | null
): boolean {
  if (!split) return false;
  return (split.serviceRevenue || 0) > 0 && (split.productRevenue || 0) > 0;
}

