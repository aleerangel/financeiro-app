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
  include_pix_default: boolean;
}

export interface TemplateVariables {
  nome: string;
  primeiro_nome?: string;
  valor: string;
  vencimento?: string | null;
  dias_atraso?: number | null;
  itens?: string | null;
  chave_pix?: string | null;
}

export const SYSTEM_WHATSAPP_SIGNATURE = '\n\n_Mensagem enviada via BarberFin_';

export const DEFAULT_TEMPLATES = {
  friendly:
    'Fala {primeiro_nome}, tudo bem, irmão? Passando só pra te lembrar do seu acerto de {valor} aqui na barbearia{vencimento_texto}. Quando der, dá uma olhada por favor. Valeu demais! 💈{bloco_pix}{assinatura}',

  default:
    'Olá {primeiro_nome}, tudo bem? Passando para atualizar o seu saldo pendente de {valor} na barbearia{vencimento_texto}. Seguem os dados para acerto quando puder. Qualquer dúvida estou à disposição! 💈{bloco_pix}{assinatura}',

  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto na barbearia no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou entrar em contato para combinarmos o acerto o quanto antes.{bloco_pix}{assinatura}',

  creditReceipt:
    'Fala {primeiro_nome}, valeu demais pela presença hoje aqui na barbearia! 💈✂️\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nTmj e até a próxima!{bloco_pix}{assinatura}',
};

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
  }
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

  let output = template;

  output = output.replace(/\{nome\}/g, nomeCompleto);
  output = output.replace(/\{primeiro_nome\}/g, primeiroNome);
  output = output.replace(/\{valor\}/g, vars.valor);
  output = output.replace(/\{vencimento\}/g, vars.vencimento || 'A combinar');
  output = output.replace(/\{vencimento_texto\}/g, vencimentoTexto);
  output = output.replace(/\{dias_atraso\}/g, String(vars.dias_atraso || 0));
  output = output.replace(/\{atraso_texto\}/g, atrasoTexto);
  output = output.replace(/\{itens\}/g, vars.itens || 'Atendimento / Serviços');
  output = output.replace(/\{bloco_pix\}/g, blocoPix);
  output = output.replace(/\{assinatura\}/g, SYSTEM_WHATSAPP_SIGNATURE);

  // Se o template personalizado não tiver a tag {bloco_pix} mas o usuário quis incluir Pix, anexa antes da assinatura
  if (includePix && blocoPix && !template.includes('{bloco_pix}')) {
    if (output.includes(SYSTEM_WHATSAPP_SIGNATURE)) {
      output = output.replace(
        SYSTEM_WHATSAPP_SIGNATURE,
        `${blocoPix}${SYSTEM_WHATSAPP_SIGNATURE}`
      );
    } else {
      output = `${output}${blocoPix}`;
    }
  }

  // Garante que a assinatura do sistema esteja sempre presente se não estiver
  if (!output.includes('_Mensagem enviada via BarberFin_')) {
    output = `${output.trim()}${SYSTEM_WHATSAPP_SIGNATURE}`;
  }

  return output;
}
