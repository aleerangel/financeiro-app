'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BusinessSegment } from '@/types/database';
import { getTodayYMD } from '@/lib/date-utils';
import { addDaysYMD } from '@/lib/client-analytics';
import { DEV_CLEAN_EMAIL, DEV_DEMO_EMAIL, DEV_PASSWORD } from '@/lib/dev-sandbox-constants';
import { createAdminClient } from '@/lib/supabase/admin';

export interface CreateSandboxAccountInput {
  mode: 'clean' | 'demo';
  segment?: BusinessSegment;
}

export interface CreateSandboxAccountResult {
  success: boolean;
  email: string;
  mode: 'clean' | 'demo';
  redirectUrl: string;
}

/**
 * Cria ou reseta e autentica a conta fixa de sandbox selecionada.
 * Disponível exclusivamente em ambiente local de desenvolvimento (localhost).
 * Evita o acúmulo de usuários no banco de dados mantendo no máximo 2 contas dedicadas.
 */
export async function createSandboxAccount(
  input: CreateSandboxAccountInput
): Promise<CreateSandboxAccountResult> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');
  }

  const supabase = await createClient();
  const email = input.mode === 'clean' ? DEV_CLEAN_EMAIL : DEV_DEMO_EMAIL;

  // 1. Garante que o usuário existe no Supabase Auth e está autenticado na sessão
  const userId = await ensureDevUser(supabase, email);

  // 2. Limpa dados prévios da conta fixa para garantir auto-reset completo
  await clearUserData(supabase, userId);

  // 3. Configuração inicial de acordo com o modo
  const segment: BusinessSegment = input.segment || 'barbearia';

  if (input.mode === 'clean') {
    // Modo Zerado: Garante perfil em branco com onboarding_completed = false
    await resetCleanAccount(supabase, userId, segment);
  } else {
    // Modo Demo: Popula dados ricos e consistentes
    await seedDemoData(supabase, userId, segment);
  }

  revalidatePath('/dashboard');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/cartoes');
  revalidatePath('/fiados');
  revalidatePath('/mensalidades');

  return {
    success: true,
    email,
    mode: input.mode,
    redirectUrl: '/dashboard',
  };
}

/**
 * Realiza login rápido na conta fixa de desenvolvimento sem forçar o auto-reset se ela já existir.
 * Se a conta ainda não existir ou não possuir perfil inicial, executa o setup correspondente.
 */
export async function loginOrCreateSandboxUser(
  mode: 'clean' | 'demo' = 'demo',
  segment?: BusinessSegment
): Promise<CreateSandboxAccountResult> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');
  }

  const supabase = await createClient();
  const email = mode === 'clean' ? DEV_CLEAN_EMAIL : DEV_DEMO_EMAIL;

  // 1. Tenta login direto com credenciais fixas
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });

  if (!signInError && signInData?.user) {
    const userId = signInData.user.id;
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      if (mode === 'clean') {
        await resetCleanAccount(supabase, userId, segment || 'barbearia');
      } else {
        await seedDemoData(supabase, userId, segment || 'barbearia');
      }
    }

    return {
      success: true,
      email,
      mode,
      redirectUrl: '/dashboard',
    };
  }

  // 2. Se o usuário não existe ou falhou, cria e inicializa
  return createSandboxAccount({ mode, segment });
}

/**
 * Garante que a conta de teste existe no Supabase Auth, está confirmada e autenticada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureDevUser(supabase: any, email: string): Promise<string> {
  // 1. Tenta login direto com credenciais fixas (caso a conta já exista)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });

  if (!signInError && signInData?.user) {
    return signInData.user.id;
  }

  // 2. Se a Service Role Key estiver configurada, provisiona via API oficial de Admin
  const adminClient = createAdminClient();
  if (adminClient) {
    try {
      const { data: adminCreated, error: adminError } = await adminClient.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
      });

      if (!adminError && adminCreated?.user) {
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email,
          password: DEV_PASSWORD,
        });
        if (loginData?.user) {
          return loginData.user.id;
        }
      }
    } catch (adminErr) {
      console.warn('Tentativa via admin client:', adminErr);
    }
  }

  // 3. Se falhar por e-mail não confirmado, tenta confirmar via RPC
  if (signInError && signInError.message.toLowerCase().includes('email not confirmed')) {
    try {
      await supabase.rpc('confirm_dev_user', { p_email: email });
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password: DEV_PASSWORD,
      });
      if (!retryError && retryData?.user) {
        return retryData.user.id;
      }
    } catch (e) {
      console.warn('Aviso ao tentar confirmar email:', e);
    }
  }

  // 4. Criação padrão via signUp
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password: DEV_PASSWORD,
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('rate limit')) {
      throw new Error(
        'O Supabase bloqueou novos e-mails (email rate limit exceeded). ' +
        'Para liberar instantaneamente no ambiente local, vá em Supabase > Authentication > Providers > Email e desmarque a opção "Confirm email", ou adicione SUPABASE_SERVICE_ROLE_KEY no seu .env.local.'
      );
    }
    if (signUpError.message.toLowerCase().includes('signups are disabled')) {
      throw new Error(
        'Os cadastros por e-mail estão desativados no Supabase (Email signups are disabled). ' +
        'No painel do Supabase > Authentication > Providers > Email, mantenha "Enable Email provider" e "Allow new users to sign up" ATIVADOS (e desative apenas "Confirm email"), ou adicione SUPABASE_SERVICE_ROLE_KEY no seu .env.local.'
      );
    }
    if (!signUpError.message.toLowerCase().includes('already registered')) {
      throw new Error(signUpError.message || 'Erro ao registrar usuário de teste no Supabase Auth.');
    }
  }

  // 5. Confirma o e-mail via RPC caso o projeto exija confirmação
  try {
    await supabase.rpc('confirm_dev_user', { p_email: email });
  } catch {
    // Ignora se não existir
  }

  // 6. Login final
  const { data: finalSignIn, error: finalSignInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });

  if (!finalSignInError && finalSignIn?.user) {
    return finalSignIn.user.id;
  }

  if (finalSignInError?.message.toLowerCase().includes('database error querying schema')) {
    throw new Error(
      'Erro no schema de autenticação do Supabase. ' +
      'Por favor, execute no SQL Editor: DELETE FROM auth.users WHERE email LIKE \'dev_%@canario.app\'; ' +
      'e desmarque "Confirm email" em Authentication > Providers > Email.'
    );
  }

  throw new Error(
    finalSignInError?.message ||
    'Falha ao autenticar conta de sandbox.'
  );
}

/**
 * Remove todos os dados existentes da conta fixa, garantindo estado limpo sem afetar outras contas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function clearUserData(supabase: any, userId: string): Promise<void> {
  // Limpa tabelas na ordem inversa de dependências / chaves estrangeiras
  await supabase.from('sale_amortizations').delete().eq('user_id', userId);
  await supabase.from('subscription_invoices').delete().eq('user_id', userId);
  await supabase.from('client_subscriptions').delete().eq('user_id', userId);
  await supabase.from('subscription_plans').delete().eq('user_id', userId);
  await supabase.from('sales').delete().eq('user_id', userId);
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('recurrences').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('clients').delete().eq('user_id', userId);
  await supabase.from('products').delete().eq('user_id', userId);
  await supabase.from('credit_cards').delete().eq('user_id', userId);
  await supabase.from('categories').delete().eq('user_id', userId);
  await supabase.from('accounts').delete().eq('user_id', userId);
  await supabase.from('business_message_settings').delete().eq('user_id', userId);
}

/**
 * Prepara uma conta zerada para testar o assistente de Onboarding.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetCleanAccount(supabase: any, userId: string, segment: BusinessSegment): Promise<void> {
  // 1. Cria Conta Principal padrão limpa
  await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Principal',
    type: 'checking',
    initial_balance: 0.0,
    color: '#3b82f6',
  });

  // 2. Cria categorias padrão pessoais
  await supabase.from('categories').insert([
    { user_id: userId, name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#ef4444', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Moradia', type: 'expense', icon: 'home', color: '#f97316', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Transporte', type: 'expense', icon: 'car', color: '#f59e0b', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Lazer', type: 'expense', icon: 'film', color: '#8b5cf6', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Saúde', type: 'expense', icon: 'activity', color: '#ec4899', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Salário', type: 'income', icon: 'briefcase', color: '#3b82f6', is_default: true, scope: 'personal' },
    { user_id: userId, name: 'Outras Receitas', type: 'income', icon: 'plus-circle', color: '#34d399', is_default: true, scope: 'personal' },
  ]);

  // 3. Define business_profile com onboarding_completed = false
  await supabase.from('business_profiles').upsert(
    {
      user_id: userId,
      business_name: 'Meu Negócio',
      segment,
      has_business: true,
      sales_label: 'Atendimentos',
      default_cycle_days: 21,
      onboarding_completed: false, // Força a exibição do Onboarding
      legacy_migrated: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Popula a conta com dados simulados realistas para testes completos do Canário.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedDemoData(supabase: any, userId: string, segment: BusinessSegment): Promise<void> {
  const today = getTodayYMD();

  // 1. Perfil do Negócio Demo
  await supabase.from('business_profiles').upsert(
    {
      user_id: userId,
      business_name: 'Studio & Negócio Demo',
      segment,
      has_business: true,
      sales_label: segment === 'barbearia' ? 'Atendimentos' : 'Serviços',
      default_cycle_days: 21,
      onboarding_completed: true,
      legacy_migrated: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  // 2. Contas Bancárias
  const { data: accNubank } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Nubank PJ',
      type: 'checking',
      color: '#8b5cf6',
      initial_balance: 3250.0,
      yield_type: 'cdi_percent',
      yield_rate: 100,
    })
    .select()
    .single();

  const { data: accItau } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Itaú Pessoal',
      type: 'checking',
      color: '#f97316',
      initial_balance: 6100.0,
    })
    .select()
    .single();

  const { data: accCaixa } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Dinheiro em Caixa',
      type: 'wallet',
      color: '#10b981',
      initial_balance: 450.0,
    })
    .select()
    .single();

  const primaryAccountId = accNubank?.id || accItau?.id || accCaixa?.id;

  // 3. Cartão de Crédito
  const { data: cardBlack } = await supabase
    .from('credit_cards')
    .insert({
      user_id: userId,
      name: 'Nubank Ultravioleta',
      color: '#4c1d95',
      credit_limit: 10000.0,
      closing_day: 20,
      due_day: 28,
    })
    .select()
    .single();

  // 4. Categorias Padrão
  const { data: catAtendimentos } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Atendimentos & Serviços',
      type: 'income',
      color: '#10b981',
      icon: 'scissors',
      scope: 'business',
      is_default: true,
    })
    .select()
    .single();

  const { data: catInsumos } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Insumos & Produtos',
      type: 'expense',
      color: '#f59e0b',
      icon: 'package',
      scope: 'business',
      is_default: true,
    })
    .select()
    .single();

  const { data: catAlimentacao } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Alimentação & Lazer',
      type: 'expense',
      color: '#ef4444',
      icon: 'utensils',
      scope: 'personal',
      is_default: true,
    })
    .select()
    .single();

  // 5. Catálogo de Produtos e Serviços
  await supabase.from('products').insert([
    {
      user_id: userId,
      name: 'Corte Degradê Especial',
      type: 'service',
      default_price: 45.0,
      icon: 'scissors',
      color: '#10b981',
    },
    {
      user_id: userId,
      name: 'Barba Terapia com Toalha Quente',
      type: 'service',
      default_price: 35.0,
      icon: 'sparkles',
      color: '#06b6d4',
    },
    {
      user_id: userId,
      name: 'Pomada Matte Efeito Seco',
      type: 'product',
      default_price: 40.0,
      icon: 'package',
      color: '#f59e0b',
    },
  ]);

  // 6. Clientes com Históricos Preditivos
  // Cliente 1: Na Janela (veio há 18 dias, ciclo 20 dias)
  const { data: cliLucas } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: 'Lucas Mendes',
      phone: '11988887777',
      notes: 'Gosta de corte degradê navalhado e café sem açúcar.',
    })
    .select()
    .single();

  // Cliente 2: Em Dia (veio há 4 dias)
  const { data: cliFelipe } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: 'Felipe Santos',
      phone: '11977776666',
      notes: 'Cliente mensalista VIP.',
    })
    .select()
    .single();

  // Cliente 3: Atrasado (veio há 32 dias)
  const { data: cliCarlos } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: 'Carlos Eduardo',
      phone: '11966665555',
    })
    .select()
    .single();

  // Cliente 4: Sumido (veio há 65 dias) e Cliente 5: Novo
  await supabase.from('clients').insert([
    {
      user_id: userId,
      name: 'Rodrigo Lima',
      phone: '11955554444',
    },
    {
      user_id: userId,
      name: 'Marcos Paulo',
      phone: '11944443333',
    },
  ]);

  // 7. Vendas e Histórico dos Clientes
  if (cliLucas) {
    const date1 = addDaysYMD(today, -58);
    const date2 = addDaysYMD(today, -38);
    const date3 = addDaysYMD(today, -18);

    await supabase.from('sales').insert([
      {
        user_id: userId,
        client_id: cliLucas.id,
        client_name: cliLucas.name,
        total_amount: 45.0,
        payment_method: 'pix',
        account_id: primaryAccountId,
        status: 'paid',
        paid_amount: 45.0,
        sale_date: `${date1}T14:00:00Z`,
      },
      {
        user_id: userId,
        client_id: cliLucas.id,
        client_name: cliLucas.name,
        total_amount: 45.0,
        payment_method: 'pix',
        account_id: primaryAccountId,
        status: 'paid',
        paid_amount: 45.0,
        sale_date: `${date2}T14:30:00Z`,
      },
      {
        user_id: userId,
        client_id: cliLucas.id,
        client_name: cliLucas.name,
        total_amount: 80.0,
        payment_method: 'pix',
        account_id: primaryAccountId,
        status: 'paid',
        paid_amount: 80.0,
        sale_date: `${date3}T15:00:00Z`,
      },
    ]);
  }

  // 8. Venda a Prazo (Fiado) para testar cobrança e amortização
  if (cliCarlos) {
    const saleDueDate = addDaysYMD(today, 5);
    await supabase.from('sales').insert({
      user_id: userId,
      client_id: cliCarlos.id,
      client_name: cliCarlos.name,
      total_amount: 85.0,
      payment_method: 'on_credit',
      status: 'pending',
      paid_amount: 0.0,
      remaining_amount: 85.0,
      due_date: saleDueDate,
      sale_date: `${addDaysYMD(today, -2)}T16:00:00Z`,
      notes: '1x Corte Degradê + 1x Pomada Matte a prazo',
    });
  }

  // 9. Assinatura Recorrente (Mensalista)
  if (cliFelipe) {
    await supabase.from('client_subscriptions').insert({
      user_id: userId,
      client_id: cliFelipe.id,
      custom_plan_name: 'Clube VIP Cabelo & Barba',
      price: 130.0,
      due_day: 10,
      start_date: addDaysYMD(today, -40),
      status: 'active',
    });
  }

  // 10. Movimentações Financeiras para preencher o Dashboard e Gráficos
  interface SandboxTransactionInsert {
    user_id: string;
    account_id: string;
    credit_card_id?: string;
    category_id?: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    is_paid: boolean;
    notes: string;
  }

  const transactionsToInsert: SandboxTransactionInsert[] = [
    {
      user_id: userId,
      account_id: primaryAccountId,
      category_id: catAtendimentos?.id,
      description: 'Atendimentos do dia (Pix)',
      amount: 480.0,
      type: 'income',
      date: today,
      is_paid: true,
      notes: '[escopo:business] Balcão de atendimento',
    },
    {
      user_id: userId,
      account_id: primaryAccountId,
      category_id: catInsumos?.id,
      description: 'Compra de Lâminas e Pomadas',
      amount: 140.0,
      type: 'expense',
      date: addDaysYMD(today, -3),
      is_paid: true,
      notes: '[escopo:business] Reposição de estoque',
    },
    {
      user_id: userId,
      account_id: accItau?.id || primaryAccountId,
      category_id: catAlimentacao?.id,
      description: 'Supermercado e Restaurante',
      amount: 220.0,
      type: 'expense',
      date: addDaysYMD(today, -1),
      is_paid: true,
      notes: '[escopo:personal] Almoço em família',
    },
  ];

  if (cardBlack) {
    transactionsToInsert.push({
      user_id: userId,
      account_id: primaryAccountId,
      credit_card_id: cardBlack.id,
      category_id: catInsumos?.id,
      description: 'Maquininha de Cartão e Acessórios',
      amount: 350.0,
      type: 'expense',
      date: addDaysYMD(today, -5),
      is_paid: false,
      notes: '[escopo:business] Parcela 1 de 3',
    });
  }

  await supabase.from('transactions').insert(transactionsToInsert);
}
