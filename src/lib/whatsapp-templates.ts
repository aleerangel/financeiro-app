export type PixKeyType = 'phone' | 'cpf' | 'cnpj' | 'email' | 'random';

export interface BusinessMessageSettings {
  user_id?: string;
  pix_key_type: PixKeyType;
  pix_key: string | null;
  pix_holder_name: string | null;
  template_friendly: string | null;
  template_default: string | null;
  template_firm: string | null;
  template_sale_credit_receipt: string | null;
  template_return_window?: string | null;
  template_inactive_recovery?: string | null;
  template_birthday?: string | null;
  template_subscription_invoice?: string | null;
  include_pix_default: boolean;
}

export interface TemplateVariables {
  nome: string;
  primeiro_nome?: string;
  valor?: string;
  vencimento?: string | null;
  dias_atraso?: number | null;
  dias_ultima_visita?: number | null;
  itens?: string | null;
  plano?: string | null;
  metodo_pagamento?: string | null;
  chave_pix?: string | null;
}

export const SYSTEM_WHATSAPP_SIGNATURE = '\n\n_Mensagem enviada via Canário_';

export function resolveWhatsAppSignature(businessName?: string | null): string {
  if (businessName && businessName.trim()) {
    return `\n\n_— ${businessName.trim()} • via Canário_`;
  }
  return SYSTEM_WHATSAPP_SIGNATURE;
}

export const DEFAULT_TEMPLATES = {
  // Cobranças
  friendly:
    'Fala {primeiro_nome}, tudo bem, irmão? Passando só pra te lembrar do seu acerto de {valor} aqui na barbearia{vencimento_texto}. Quando der, dá uma olhada por favor. Valeu demais! 💈{bloco_pix}{assinatura}',

  default:
    'Olá {primeiro_nome}, tudo bem? Passando para atualizar o seu saldo pendente de {valor} na barbearia{vencimento_texto}. Seguem os dados para acerto quando puder. Qualquer dúvida estou à disposição! 💈{bloco_pix}{assinatura}',

  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto na barbearia no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou entrar em contato para combinarmos o acerto o quanto antes.{bloco_pix}{assinatura}',

  // Recibo de Fiado Imediato
  creditReceipt:
    'Fala {primeiro_nome}, valeu demais pela presença hoje aqui na barbearia! 💈✂️\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nTmj e até a próxima!{bloco_pix}{assinatura}',

  // Radar de Retorno
  returnWindowCasual:
    'Fala {primeiro_nome}, tudo na paz, irmão? Já faz cerca de {dias_ultima_visita} dias desde o seu último corte aqui com a gente. Bora renovar o visual essa semana? ✂️💈{assinatura}',

  returnWindowVip:
    'Olá {primeiro_nome}! Como está a semana? Notamos que seu ciclo de corte está no momento ideal ({dias_ultima_visita} dias). Se quiser, já posso garantir seu horário nos próximos dias! Abraço! 💈{assinatura}',

  // Resgate de Inativos
  inactiveRecoveryCasual:
    'Fala {primeiro_nome}, sumiu, irmão! Já faz mais de {dias_ultima_visita} dias que a gente não se vê por aqui. Sentimos sua falta na barbearia! Como estão as coisas? Bora dar aquele talento no estilo essa semana? 💈{assinatura}',

  inactiveRecoveryPromo:
    'Fala {primeiro_nome}! Sentimos sua falta aqui na barbearia! Que tal passar essa semana para renovar o corte e tomar uma gelada com a gente? Tenho uma condição especial esperando por você! Tmj! 💈{assinatura}',

  // Aniversário
  birthdayCasual:
    'Fala {primeiro_nome}, parabéns pelo seu dia, irmão! 🎂🎉 Muita saúde, paz e sucesso sempre! Que seu novo ciclo seja repleto de conquistas! Abraço da equipe! 💈{assinatura}',

  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje o dia é todo seu! 🎂✂️ Passando pra te desejar um feliz aniversário e te presentear com aquele talento especial no corte essa semana pra você comemorar em grande estilo! Bora marcar? Tmj! 💈{assinatura}',

  // Mensalidade / Assinatura de Clube
  subscriptionInvoice:
    'Fala {primeiro_nome}, tudo na paz, irmão? 💈 Passando para lembrar da sua mensalidade do clube da barbearia ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue a nossa chave para acerto via Pix. Valeu pela parceria! ✂️🔥{bloco_pix}{assinatura}',

  // Recibo de Quitação da Mensalidade
  subscriptionReceipt:
    'Fala {primeiro_nome}, tudo bem, irmão? 💈 Confirmamos o recebimento da sua mensalidade da barbearia ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigado pela confiança e parceria de sempre! Estilo sempre em dia! Tmj! ✂️🔥{assinatura}',
};

export const DEFAULT_NEUTRAL_TEMPLATES = {
  // Cobranças
  friendly:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar do seu acerto de {valor}{vencimento_texto}. Seguem os dados para acerto via Pix quando puder. Agradecemos pela parceria!{bloco_pix}{assinatura}',

  default:
    'Olá {primeiro_nome}, tudo bem? Passando para atualizar o seu saldo pendente de {valor}{vencimento_texto}. Seguem as informações para acerto. Qualquer dúvida estou à disposição!{bloco_pix}{assinatura}',

  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou entrar em contato para combinarmos o acerto o quanto antes.{bloco_pix}{assinatura}',

  // Recibo de Fiado / Venda a Prazo
  creditReceipt:
    'Olá {primeiro_nome}, muito obrigado pela preferência!\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nQualquer dúvida estou à disposição!{bloco_pix}{assinatura}',

  // Radar de Retorno
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz cerca de {dias_ultima_visita} dias desde o seu último atendimento com a gente. Como estão as coisas? Se precisar agendar novos serviços, estamos à disposição!{assinatura}',

  returnWindowVip:
    'Olá {primeiro_nome}! Como está sua semana? Notamos que seu ciclo de atendimento está no momento ideal ({dias_ultima_visita} dias). Se desejar agendar seu próximo horário com prioridade, estou à disposição!{assinatura}',

  // Resgate de Inativos
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz mais de {dias_ultima_visita} dias desde a sua última visita. Estamos à disposição caso precise de novos atendimentos ou serviços!{assinatura}',

  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Sentimos sua falta por aqui. Que tal agendar seu próximo atendimento essa semana? Temos condições especiais esperando por você!{assinatura}',

  // Aniversário
  birthdayCasual:
    'Olá {primeiro_nome}, parabéns pelo seu aniversário! 🎂🎉 Muita saúde, paz e sucesso! Que seu novo ciclo seja repleto de realizações!{assinatura}',

  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje é o seu dia! 🎂 Passando para desejar um feliz aniversário e um novo ciclo repleto de conquistas! Conte sempre com a gente!{assinatura}',

  // Mensalidade / Assinatura
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar da sua mensalidade ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue a nossa chave para acerto via Pix. Obrigado pela parceria!{bloco_pix}{assinatura}',

  // Recibo de Quitação
  subscriptionReceipt:
    'Olá {primeiro_nome}, tudo bem? Confirmamos o recebimento da sua mensalidade ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigado pela confiança e parceria de sempre!{assinatura}',
};

export function getTemplatesForSegment(segment?: string | null) {
  if (segment === 'barbearia') {
    return DEFAULT_TEMPLATES;
  }
  return DEFAULT_NEUTRAL_TEMPLATES;
}

export const PIX_KEY_LABELS: Record<PixKeyType, string> = {
  phone: 'Celular / WhatsApp',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  random: 'Chave Aleatória',
};

export function formatPixBlock(
  key?: string | null,
  keyType?: PixKeyType,
  holderName?: string | null
): string {
  if (!key || !key.trim()) return '';

  const label = keyType ? PIX_KEY_LABELS[keyType] || 'Pix' : 'Pix';
  const holder = holderName && holderName.trim() ? ` (${holderName.trim()})` : '';

  return `\n\n🔑 Chave Pix para pagamento:\n${key.trim()} [${label}]${holder}`;
}

export function renderWhatsAppTemplate(
  template: string,
  vars: TemplateVariables,
  includePix: boolean = true,
  pixSettings?: {
    key?: string | null;
    keyType?: PixKeyType;
    holderName?: string | null;
  },
  businessName?: string | null
): string {
  const nomeCompleto = vars.nome.trim();
  const primeiroNome =
    vars.primeiro_nome || nomeCompleto.split(' ')[0] || nomeCompleto;

  const vencimentoTexto = vars.vencimento
    ? ` (combinado para ${vars.vencimento})`
    : '';

  let atrasoTexto = '';
  if (typeof vars.dias_atraso === 'number' && vars.dias_atraso > 0) {
    atrasoTexto = ` (vencido há ${vars.dias_atraso} ${
      vars.dias_atraso === 1 ? 'dia' : 'dias'
    })`;
  } else if (vars.vencimento) {
    atrasoTexto = ` (vencimento: ${vars.vencimento})`;
  }

  const blocoPix =
    includePix && pixSettings?.key
      ? formatPixBlock(pixSettings.key, pixSettings.keyType, pixSettings.holderName)
      : '';

  const signature = resolveWhatsAppSignature(businessName);
  let output = template;

  output = output.replace(/\{nome\}/g, nomeCompleto);
  output = output.replace(/\{primeiro_nome\}/g, primeiroNome);
  output = output.replace(/\{valor\}/g, vars.valor || 'R$ 0,00');
  output = output.replace(/\{vencimento\}/g, vars.vencimento || 'A combinar');
  output = output.replace(/\{vencimento_texto\}/g, vencimentoTexto);
  output = output.replace(/\{dias_atraso\}/g, String(vars.dias_atraso || 0));
  output = output.replace(/\{atraso_texto\}/g, atrasoTexto);
  output = output.replace(
    /\{dias_ultima_visita\}/g,
    String(vars.dias_ultima_visita || 30)
  );
  output = output.replace(/\{itens\}/g, vars.itens || 'Atendimento / Serviços');
  output = output.replace(/\{plano\}/g, vars.plano || 'Assinatura');
  output = output.replace(
    /\{metodo_pagamento\}/g,
    vars.metodo_pagamento || 'Pix'
  );
  output = output.replace(
    /\{metodo_pagamento_texto\}/g,
    vars.metodo_pagamento ? ` via ${vars.metodo_pagamento}` : ''
  );
  output = output.replace(/\{bloco_pix\}/g, blocoPix);
  output = output.replace(/\{assinatura\}/g, signature);

  // Se o template personalizado não tiver a tag {bloco_pix} mas o usuário quis incluir Pix, anexa antes da assinatura
  if (includePix && blocoPix && !template.includes('{bloco_pix}')) {
    if (output.includes(signature)) {
      output = output.replace(
        signature,
        `${blocoPix}${signature}`
      );
    } else {
      output = `${output}${blocoPix}`;
    }
  }

  // Garante que a assinatura do sistema ou negócio esteja presente
  if (!output.includes(signature) && !output.includes('via Canário')) {
    output = `${output.trim()}${signature}`;
  }

  return output;
}
