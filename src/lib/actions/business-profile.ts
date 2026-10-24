'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { BusinessProfile, BusinessSegment } from '@/types/database';
import {
  getSegmentConfig,
  resolveBusinessProfile,
  DEFAULT_BUSINESS_PROFILE,
} from '@/lib/business-presets';

export interface SaveBusinessProfileInput {
  business_name?: string | null;
  segment: BusinessSegment;
  has_business?: boolean;
  sales_label?: string;
  default_cycle_days?: number;
}

export interface CompleteOnboardingInput {
  has_business: boolean;
  business_name?: string | null;
  segment?: BusinessSegment;
  sales_label?: string;
  default_cycle_days?: number;
  pix_key?: string | null;
  pix_key_type?: 'phone' | 'cpf' | 'cnpj' | 'email' | 'random';
  pix_holder_name?: string | null;
}

/**
 * Obtém o perfil de negócio do usuário com cache de request (React.cache).
 * Garante fallback seguro e tolerância a falhas para qualquer usuário.
 */
export const getBusinessProfile = cache(async (): Promise<BusinessProfile> => {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return DEFAULT_BUSINESS_PROFILE;
  }

  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      return resolveBusinessProfile(data, user.email);
    }

    // Se o perfil ainda não existe no banco (ex: usuário legado antes da migração rodar)
    // Verifica se ele já possui histórico de barbearia
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isLegacyUser = (salesCount ?? 0) > 0;

    return resolveBusinessProfile(
      {
        user_id: user.id,
        business_name: isLegacyUser ? 'Minha Barbearia' : 'Meu Negócio',
        segment: isLegacyUser ? 'barbearia' : 'outro',
        has_business: true,
        sales_label: 'Atendimentos',
        default_cycle_days: 21,
        onboarding_completed: isLegacyUser,
        legacy_migrated: !isLegacyUser,
      },
      user.email
    );
  } catch (err) {
    console.error('Erro ao buscar perfil de negócio (usando fallback seguro):', err);
    return resolveBusinessProfile({ user_id: user.id }, user.email);
  }
});

/**
 * Salva ou atualiza as preferências do negócio do usuário.
 */
export async function saveBusinessProfile(input: SaveBusinessProfileInput): Promise<BusinessProfile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const segmentCfg = getSegmentConfig(input.segment);
  const salesLabel = input.sales_label?.trim() || segmentCfg.defaultSalesLabel;
  const cycleDays =
    input.default_cycle_days && input.default_cycle_days > 0
      ? input.default_cycle_days
      : segmentCfg.defaultCycleDays;

  const payload = {
    user_id: user.id,
    business_name: input.business_name?.trim() || null,
    segment: input.segment,
    has_business: input.has_business !== undefined ? input.has_business : true,
    sales_label: salesLabel,
    default_cycle_days: cycleDays,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao salvar perfil do negócio.');
  }

  revalidatePath('/dashboard');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/configuracoes');

  return resolveBusinessProfile(data, user.email);
}

/**
 * Conclui o processo de onboarding de primeiro acesso.
 * Se has_business for true, gera as categorias sugeridas do segmento e salva a chave Pix se fornecida.
 */
export async function completeOnboarding(input: CompleteOnboardingInput): Promise<BusinessProfile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const segment = input.segment || 'outro';
  const segmentCfg = getSegmentConfig(segment);
  const salesLabel = input.sales_label?.trim() || segmentCfg.defaultSalesLabel;

  // 1. Salva o perfil com onboarding_completed = true
  const profilePayload = {
    user_id: user.id,
    business_name: input.business_name?.trim() || (input.has_business ? 'Meu Negócio' : null),
    segment,
    has_business: input.has_business,
    sales_label: salesLabel,
    default_cycle_days: input.default_cycle_days || segmentCfg.defaultCycleDays,
    onboarding_completed: true,
    legacy_migrated: true,
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error: profError } = await supabase
    .from('business_profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
    .select()
    .single();

  if (profError) {
    throw new Error(profError.message);
  }

  // 2. Se ativou o negócio, cria categorias sugeridas que ainda não existam
  if (input.has_business && segmentCfg.suggestedCategories.length > 0) {
    try {
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user.id);

      const existingNames = new Set(
        (existingCategories || []).map((c) => c.name.trim().toLowerCase())
      );

      const toInsert = segmentCfg.suggestedCategories
        .filter((sc) => !existingNames.has(sc.name.trim().toLowerCase()))
        .map((sc) => ({
          user_id: user.id,
          name: sc.name,
          type: sc.type,
          icon: sc.icon,
          color: sc.color,
          scope: 'business' as const,
          is_default: true,
        }));

      if (toInsert.length > 0) {
        await supabase.from('categories').insert(toInsert);
      }
    } catch (catErr) {
      console.error('Aviso: falha ao gerar categorias automáticas do segmento:', catErr);
    }
  }

  // 3. Salva chave Pix se fornecida
  if (input.has_business && input.pix_key && input.pix_key.trim()) {
    try {
      await supabase
        .from('business_message_settings')
        .upsert(
          {
            user_id: user.id,
            pix_key: input.pix_key.trim(),
            pix_key_type: input.pix_key_type || 'phone',
            pix_holder_name: input.pix_holder_name?.trim() || input.business_name?.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch (pixErr) {
      console.error('Aviso: falha ao salvar chave Pix do onboarding:', pixErr);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/transacoes');

  return resolveBusinessProfile(profile, user.email);
}

/**
 * Descarta o banner sutil de boas-vindas ao Canário para usuários legados.
 */
export async function dismissLegacyWelcomeBanner(): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return;

  await supabase
    .from('business_profiles')
    .update({ legacy_migrated: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  revalidatePath('/dashboard');
}

