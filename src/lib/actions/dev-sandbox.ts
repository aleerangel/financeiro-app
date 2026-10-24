'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BusinessSegment } from '@/types/database';
import { getTodayYMD } from '@/lib/date-utils';
import { addDaysYMD } from '@/lib/client-analytics';

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
 * Cria e autentica automaticamente uma nova conta efêmera de teste (Sandbox).
 * Disponível exclusivamente em ambiente local de desenvolvimento (localhost).
 */
export async function createSandboxAccount(
  input: CreateSandboxAccountInput
): Promise<CreateSandboxAccountResult> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');
  }

  const supabase = await createClient();

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const email = `dev_${input.mode}_${timestamp}_${randomSuffix}@canario.app`;
  const password = `CanarioDev_${timestamp}!`;

  // 1. Cadastra o usuário de teste
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    throw new Error(signUpError?.message || 'Erro ao criar usuário de teste no Supabase Auth.');
  }

  const userId = signUpData.user.id;

  // 2. Confirma o e-mail via RPC para permitir login imediato sem envio de link externo
  try {
    await supabase.rpc('confirm_dev_user', { p_email: email });
  } catch (rpcErr) {
    console.warn('Aviso: RPC confirm_dev_user não disponível ou falhou:', rpcErr);
  }

  // 3. Efetua login para emitir e gravar os cookies de sessão no Next.js
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // Se o Supabase exigir confirmação manual e a RPC não estiver aplicada, avisa claramente
    if (signInError.message.includes('Email not confirmed')) {
      throw new Error(
        'E-mail da conta de teste não foi confirmado automaticamente. ' +
        'Por favor, aplique a migração supabase/migrations/20261024040000_dev_sandbox_auth.sql no SQL Editor do Supabase.'
      );
    }
    throw new Error(signInError.message);
  }

  // 4. Configuração inicial de acordo com o modo
  const segment: BusinessSegment = input.segment || 'barbearia';

  if (input.mode === 'clean') {
    // Conta zerada: garante onboarding_completed = false para abrir no assistente de primeiro acesso
    await supabase.from('business_profiles').upsert(
      {
        user_id: userId,
        business_name: 'Meu Negócio',
        segment,
        has_business: true,
        sales_label: 'Atendimentos',
        default_cycle_days: 21,
        onboarding_completed: false,
        legacy_migrated: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } else {
    // Conta Demo: popula dados ricos para visualização completa
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
 * Popula a conta com dados simulados realistas para testes completos do Canário.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedDemoData(supabase: any, userId: string, segment: BusinessSegment) {
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

  // Cliente 4: Sumido (veio há 65 dias) e Cliente 5: Novo (apenas 1 visita)
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
    // 3 atendimentos anteriores para gerar ciclo de 20 dias
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
