import { BusinessProfile, BusinessSegment } from '@/types/database';

export interface SuggestedCategory {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  scope: 'business';
}

export interface SegmentConfig {
  id: BusinessSegment;
  label: string;
  description: string;
  icon: string;
  defaultSalesLabel: string;
  newSaleActionLabel: string;
  defaultCycleDays: number;
  suggestedCategories: SuggestedCategory[];
}

export const SEGMENTS_CONFIG: Record<BusinessSegment, SegmentConfig> = {
  barbearia: {
    id: 'barbearia',
    label: 'Barbearia',
    description: 'Cortes, barba, venda de pomadas e planos de assinatura',
    icon: 'scissors',
    defaultSalesLabel: 'Atendimentos',
    newSaleActionLabel: 'Novo Atendimento',
    defaultCycleDays: 21,
    suggestedCategories: [
      { name: 'Barbearia', type: 'income', icon: 'scissors', color: '#10b981', scope: 'business' },
      { name: 'Insumos & Barbearia', type: 'expense', icon: 'scissors', color: '#f59e0b', scope: 'business' },
    ],
  },
  beleza_estetica: {
    id: 'beleza_estetica',
    label: 'Beleza, Estética & Bem-Estar',
    description: 'Salões de beleza, manicures, clínicas de estética, spas e tatuadores',
    icon: 'sparkles',
    defaultSalesLabel: 'Atendimentos',
    newSaleActionLabel: 'Novo Atendimento',
    defaultCycleDays: 30,
    suggestedCategories: [
      { name: 'Serviços de Beleza & Estética', type: 'income', icon: 'sparkles', color: '#10b981', scope: 'business' },
      { name: 'Venda de Cosméticos & Produtos', type: 'income', icon: 'package', color: '#06b6d4', scope: 'business' },
      { name: 'Insumos & Descartáveis', type: 'expense', icon: 'scissors', color: '#f59e0b', scope: 'business' },
      { name: 'Equipamentos & Manutenção', type: 'expense', icon: 'wrench', color: '#ef4444', scope: 'business' },
    ],
  },
  servicos_manutencao: {
    id: 'servicos_manutencao',
    label: 'Serviços Gerais & Manutenção',
    description: 'Oficinas, técnicos de celular/computador, eletricistas, marceneiros e encanadores',
    icon: 'wrench',
    defaultSalesLabel: 'Ordens de Serviço',
    newSaleActionLabel: 'Nova O.S.',
    defaultCycleDays: 90,
    suggestedCategories: [
      { name: 'Mão de Obra & Serviços', type: 'income', icon: 'wrench', color: '#10b981', scope: 'business' },
      { name: 'Venda de Peças & Componentes', type: 'income', icon: 'package', color: '#06b6d4', scope: 'business' },
      { name: 'Peças & Materiais Aplicados', type: 'expense', icon: 'cog', color: '#f59e0b', scope: 'business' },
      { name: 'Ferramentas & Equipamentos', type: 'expense', icon: 'hammer', color: '#ef4444', scope: 'business' },
    ],
  },
  saude_consultorio: {
    id: 'saude_consultorio',
    label: 'Saúde & Consultórios',
    description: 'Psicólogos, nutricionistas, fisioterapeutas, dentistas e terapeutas',
    icon: 'activity',
    defaultSalesLabel: 'Consultas',
    newSaleActionLabel: 'Nova Consulta',
    defaultCycleDays: 30,
    suggestedCategories: [
      { name: 'Consultas & Sessões', type: 'income', icon: 'activity', color: '#10b981', scope: 'business' },
      { name: 'Procedimentos Clínicos', type: 'income', icon: 'heart', color: '#06b6d4', scope: 'business' },
      { name: 'Materiais Clínicos & Descartáveis', type: 'expense', icon: 'clipboard', color: '#f59e0b', scope: 'business' },
      { name: 'Cursos & Atualização Profissional', type: 'expense', icon: 'book-open', color: '#8b5cf6', scope: 'business' },
    ],
  },
  aulas_treinamento: {
    id: 'aulas_treinamento',
    label: 'Aulas, Treinamento & Consultoria',
    description: 'Personal trainers, professores particulares, instrutores de dança/luta e consultores',
    icon: 'graduation-cap',
    defaultSalesLabel: 'Aulas & Sessões',
    newSaleActionLabel: 'Nova Aula',
    defaultCycleDays: 7,
    suggestedCategories: [
      { name: 'Aulas & Treinamentos', type: 'income', icon: 'graduation-cap', color: '#10b981', scope: 'business' },
      { name: 'Planos & Mensalidades de Alunos', type: 'income', icon: 'repeat', color: '#06b6d4', scope: 'business' },
      { name: 'Aluguel de Espaço / Quadra / Estúdio', type: 'expense', icon: 'home', color: '#f59e0b', scope: 'business' },
      { name: 'Equipamentos & Acessórios', type: 'expense', icon: 'dumbbell', color: '#ef4444', scope: 'business' },
    ],
  },
  comercio_geral: {
    id: 'comercio_geral',
    label: 'Comércio Rápido & Autônomos em Geral',
    description: 'Venda de produtos, lanches, pequenos artesãos e autônomos sem segmento específico',
    icon: 'shopping-bag',
    defaultSalesLabel: 'Vendas & Pedidos',
    newSaleActionLabel: 'Nova Venda',
    defaultCycleDays: 30,
    suggestedCategories: [
      { name: 'Venda de Mercadorias', type: 'income', icon: 'shopping-bag', color: '#10b981', scope: 'business' },
      { name: 'Prestação de Serviços', type: 'income', icon: 'briefcase', color: '#06b6d4', scope: 'business' },
      { name: 'Mercadorias para Revenda', type: 'expense', icon: 'package', color: '#f59e0b', scope: 'business' },
      { name: 'Embalagens & Entregas', type: 'expense', icon: 'truck', color: '#f97316', scope: 'business' },
    ],
  },
  outro: {
    id: 'outro',
    label: 'Outro Segmento / Geral',
    description: 'Qualquer outra atividade profissional ou de prestação de serviços',
    icon: 'briefcase',
    defaultSalesLabel: 'Atendimentos',
    newSaleActionLabel: 'Novo Atendimento',
    defaultCycleDays: 30,
    suggestedCategories: [
      { name: 'Receitas do Negócio', type: 'income', icon: 'briefcase', color: '#10b981', scope: 'business' },
      { name: 'Custos Operacionais', type: 'expense', icon: 'tag', color: '#f59e0b', scope: 'business' },
    ],
  },
};

export const ALL_SEGMENTS: SegmentConfig[] = Object.values(SEGMENTS_CONFIG);

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  user_id: '',
  business_name: 'Meu Negócio',
  segment: 'barbearia',
  has_business: true,
  sales_label: 'Atendimentos',
  default_cycle_days: 21,
  onboarding_completed: true,
  legacy_migrated: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Retorna a configuração de um segmento com fallback seguro para 'outro'.
 */
export function getSegmentConfig(segment?: BusinessSegment | string | null): SegmentConfig {
  if (segment && segment in SEGMENTS_CONFIG) {
    return SEGMENTS_CONFIG[segment as BusinessSegment];
  }
  return SEGMENTS_CONFIG.outro;
}

/**
 * Garante que um objeto de perfil sempre contenha todos os campos obrigatórios
 * mesmo em cenários de banco legado ou transição.
 */
export function resolveBusinessProfile(
  raw?: Partial<BusinessProfile> | null,
  userEmail?: string
): BusinessProfile {
  if (!raw) {
    const fallbackName = userEmail ? `Negócio de ${userEmail.split('@')[0]}` : 'Meu Negócio';
    return {
      ...DEFAULT_BUSINESS_PROFILE,
      business_name: fallbackName,
    };
  }

  const segment = (raw.segment && raw.segment in SEGMENTS_CONFIG) ? raw.segment : 'outro';
  const segmentCfg = getSegmentConfig(segment);

  return {
    user_id: raw.user_id || '',
    business_name: raw.business_name?.trim() || 'Meu Negócio',
    segment,
    has_business: raw.has_business !== undefined ? Boolean(raw.has_business) : true,
    sales_label: raw.sales_label?.trim() || segmentCfg.defaultSalesLabel,
    default_cycle_days: raw.default_cycle_days && raw.default_cycle_days > 0 ? raw.default_cycle_days : segmentCfg.defaultCycleDays,
    onboarding_completed: Boolean(raw.onboarding_completed),
    legacy_migrated: Boolean(raw.legacy_migrated),
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}
