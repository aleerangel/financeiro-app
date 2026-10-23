'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  BusinessMessageSettings,
  PixKeyType,
  DEFAULT_TEMPLATES,
} from '@/lib/whatsapp-templates';

export async function getMessageSettings(): Promise<BusinessMessageSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const defaultSettings: BusinessMessageSettings = {
    pix_key_type: 'phone',
    pix_key: null,
    pix_holder_name: null,
    template_friendly: DEFAULT_TEMPLATES.friendly,
    template_default: DEFAULT_TEMPLATES.default,
    template_firm: DEFAULT_TEMPLATES.firm,
    template_sale_credit_receipt: DEFAULT_TEMPLATES.creditReceipt,
    template_return_window: DEFAULT_TEMPLATES.returnWindowCasual,
    template_inactive_recovery: DEFAULT_TEMPLATES.inactiveRecoveryCasual,
    template_birthday: DEFAULT_TEMPLATES.birthdayCasual,
    include_pix_default: true,
  };

  if (!user) return defaultSettings;

  try {
    const { data, error } = await supabase
      .from('business_message_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return defaultSettings;
    }

    return {
      user_id: user.id,
      pix_key_type: (data.pix_key_type as PixKeyType) || 'phone',
      pix_key: data.pix_key || null,
      pix_holder_name: data.pix_holder_name || null,
      template_friendly: data.template_friendly || DEFAULT_TEMPLATES.friendly,
      template_default: data.template_default || DEFAULT_TEMPLATES.default,
      template_firm: data.template_firm || DEFAULT_TEMPLATES.firm,
      template_sale_credit_receipt:
        data.template_sale_credit_receipt || DEFAULT_TEMPLATES.creditReceipt,
      template_return_window:
        data.template_return_window || DEFAULT_TEMPLATES.returnWindowCasual,
      template_inactive_recovery:
        data.template_inactive_recovery || DEFAULT_TEMPLATES.inactiveRecoveryCasual,
      template_birthday:
        data.template_birthday || DEFAULT_TEMPLATES.birthdayCasual,
      include_pix_default: data.include_pix_default ?? true,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveMessageSettings(input: {
  pix_key_type?: PixKeyType;
  pix_key?: string | null;
  pix_holder_name?: string | null;
  template_friendly?: string | null;
  template_default?: string | null;
  template_firm?: string | null;
  template_sale_credit_receipt?: string | null;
  template_return_window?: string | null;
  template_inactive_recovery?: string | null;
  template_birthday?: string | null;
  include_pix_default?: boolean;
}): Promise<BusinessMessageSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const payload = {
    user_id: user.id,
    pix_key_type: input.pix_key_type || 'phone',
    pix_key: input.pix_key?.trim() || null,
    pix_holder_name: input.pix_holder_name?.trim() || null,
    template_friendly: input.template_friendly || DEFAULT_TEMPLATES.friendly,
    template_default: input.template_default || DEFAULT_TEMPLATES.default,
    template_firm: input.template_firm || DEFAULT_TEMPLATES.firm,
    template_sale_credit_receipt:
      input.template_sale_credit_receipt || DEFAULT_TEMPLATES.creditReceipt,
    template_return_window:
      input.template_return_window || DEFAULT_TEMPLATES.returnWindowCasual,
    template_inactive_recovery:
      input.template_inactive_recovery || DEFAULT_TEMPLATES.inactiveRecoveryCasual,
    template_birthday:
      input.template_birthday || DEFAULT_TEMPLATES.birthdayCasual,
    include_pix_default: input.include_pix_default ?? true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('business_message_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message || 'Erro ao salvar configurações de mensagens.');
  }

  revalidatePath('/fiados');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/dashboard');

  return payload;
}
