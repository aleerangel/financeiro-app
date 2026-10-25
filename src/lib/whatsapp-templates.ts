import { BusinessSegment } from '@/types/database';

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

export interface SegmentWhatsAppTemplates {
  friendly: string;
  default: string;
  firm: string;
  creditReceipt: string;
  returnWindowCasual: string;
  returnWindowVip: string;
  inactiveRecoveryCasual: string;
  inactiveRecoveryPromo: string;
  birthdayCasual: string;
  birthdayGift: string;
  subscriptionInvoice: string;
  subscriptionReceipt: string;
}

// 1. Barbearia
export const BARBER_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Fala {primeiro_nome}, tudo bem, irmão? Passando só pra te lembrar do seu acerto de {valor} aqui na barbearia{vencimento_texto}. Quando der, dá uma olhada por favor. Valeu demais! 💈{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Passando para atualizar o seu saldo pendente de {valor} na barbearia{vencimento_texto}. Seguem os dados para acerto quando puder. Qualquer dúvida estou à disposição! 💈{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto na barbearia no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou entrar em contato para combinarmos o acerto o quanto antes.{bloco_pix}{assinatura}',
  creditReceipt:
    'Fala {primeiro_nome}, valeu demais pela presença hoje aqui na barbearia! 💈✂️\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nTmj e até a próxima!{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Fala {primeiro_nome}, tudo na paz, irmão? Já faz cerca de {dias_ultima_visita} dias desde o seu último corte aqui com a gente. Bora renovar o visual essa semana? ✂️💈{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Notamos que seu ciclo de corte está no momento ideal ({dias_ultima_visita} dias). Se quiser, já posso garantir seu horário nos próximos dias! Abraço! 💈{assinatura}',
  inactiveRecoveryCasual:
    'Fala {primeiro_nome}, sumiu, irmão! Já faz mais de {dias_ultima_visita} dias que a gente não se vê por aqui. Sentimos sua falta na barbearia! Como estão as coisas? Bora dar aquele talento no estilo essa semana? 💈{assinatura}',
  inactiveRecoveryPromo:
    'Fala {primeiro_nome}! Sentimos sua falta aqui na barbearia! Que tal passar essa semana para renovar o corte? Tenho uma condição especial esperando por você! Tmj! 💈{assinatura}',
  birthdayCasual:
    'Fala {primeiro_nome}, parabéns pelo seu dia, irmão! 🎂🎉 Muita saúde, paz e sucesso sempre! Que seu novo ciclo seja repleto de conquistas! Abraço da equipe! 💈{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje o dia é todo seu! 🎂✂️ Passando pra te desejar um feliz aniversário e te presentear com aquele talento especial no corte essa semana pra você comemorar em grande estilo! Bora marcar? Tmj! 💈{assinatura}',
  subscriptionInvoice:
    'Fala {primeiro_nome}, tudo na paz, irmão? 💈 Passando para lembrar da sua mensalidade do clube da barbearia ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue a nossa chave para acerto via Pix. Valeu pela parceria! ✂️🔥{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Fala {primeiro_nome}, tudo bem, irmão? 💈 Confirmamos o recebimento da sua mensalidade da barbearia ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigado pela confiança e parceria de sempre! Estilo sempre em dia! Tmj! ✂️🔥{assinatura}',
};

export const DEFAULT_TEMPLATES = BARBER_TEMPLATES;

// 2. Beleza, Estética & Bem-Estar
export const BEAUTY_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Olá {primeiro_nome}, tudo bem? ✨ Passando com carinho para lembrar do seu acerto de {valor}{vencimento_texto}. Seguem os dados para pagamento via Pix quando puder. Muito obrigada pela confiança! 💖{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? ✨ Passando para atualizar o seu saldo pendente de {valor}{vencimento_texto}. Seguem os dados para acerto. Qualquer dúvida estou à disposição! 💅{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou nos contatar para combinarmos o acerto.{bloco_pix}{assinatura}',
  creditReceipt:
    'Olá {primeiro_nome}! Muito obrigada pelo carinho e presença hoje! ✨💖\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nAté a próxima!{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? ✨ Notamos que já faz cerca de {dias_ultima_visita} dias desde o seu último atendimento. Que tal reservar um momento especial para você e renovar o seu autocuidado essa semana? 💅💖{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Como está sua semana? Notamos que seu ciclo de beleza está no momento ideal ({dias_ultima_visita} dias). Se desejar garantir seu horário com prioridade, estou à disposição! ✨{assinatura}',
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, que saudade de você! ✨ Já faz mais de {dias_ultima_visita} dias desde a sua última visita. Sentimos sua falta por aqui! Como você está? Bora agendar um momento especial de autocuidado? 💖{assinatura}',
  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Sentimos muito a sua falta! ✨ Que tal passar aqui essa semana para cuidar de você? Preparei um mimo e uma condição super especial pra te receber de volta! 💖{assinatura}',
  birthdayCasual:
    'Parabéns {primeiro_nome}! 🎂🎉 Desejamos um feliz aniversário repleto de luz, saúde, beleza e muitas realizações! Que seu novo ciclo seja maravilhoso! ✨💖{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje o dia é todinho seu! 🎂✨ Passando para te desejar um aniversário incrível e te presentear com um mimo especial no seu próximo atendimento para você comemorar ainda mais radiante! 💖{assinatura}',
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? ✨ Passando para lembrar da sua mensalidade do plano ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue nossa chave Pix para acerto. Gratidão pela confiança! 💖{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Olá {primeiro_nome}! ✨ Confirmamos o recebimento da sua mensalidade do plano ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigada por fazer parte do nosso clube de beleza! 💖{assinatura}',
};

// 3. Serviços Gerais & Manutenção
export const MAINTENANCE_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Olá {primeiro_nome}, tudo bem? Passando para te lembrar do acerto referente à ordem de serviço no valor de {valor}{vencimento_texto}. Seguem os dados para pagamento via Pix quando puder. Obrigado pela confiança! 🔧{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Segue a atualização do saldo pendente referente aos serviços/peças no valor de {valor}{vencimento_texto}. Dados para pagamento abaixo. Qualquer dúvida sobre o serviço, estou à disposição! ⚙️{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto referente à ordem de serviço no valor de {valor}{atraso_texto}. Solicitamos a gentileza de efetuar o pagamento ou entrar em contato para alinharmos a quitação.{bloco_pix}{assinatura}',
  creditReceipt:
    'Olá {primeiro_nome}! Segue o comprovante da sua ordem de serviço concluída:\n\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nServiço entregue com garantia. Obrigado pela preferência! 🔧{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz cerca de {dias_ultima_visita} dias desde o último serviço realizado. Tudo funcionando perfeitamente? Se precisar de alguma revisão preventiva ou novo reparo, estamos à disposição! 🔧{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Passando para saber como está o funcionamento após o serviço realizado há {dias_ultima_visita} dias. Lembre-se de que manutenções preventivas garantem maior vida útil e economia. Conte conosco! ⚙️{assinatura}',
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz mais de {dias_ultima_visita} dias desde a sua última manutenção com a gente. Precisando de qualquer revisão, conserto ou suporte técnico, conte conosco! 🔧{assinatura}',
  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Já faz um tempo que não nos falamos. Estamos com condições especiais para revisões e manutenções este mês. Se estiver precisando de algum serviço, mande uma mensagem! ⚙️{assinatura}',
  birthdayCasual:
    'Olá {primeiro_nome}, parabéns pelo seu aniversário! 🎂🎉 Muita saúde, sucesso e realizações para você e toda a sua família! Forte abraço! 🤝{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! 🎂 Desejamos um feliz aniversário com muita saúde e conquistas! Como presente pelo seu dia, você tem um desconto especial em qualquer serviço realizado este mês! 🎁🔧{assinatura}',
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? Segue o lembrete da mensalidade do seu contrato de manutenção preventiva ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue chave Pix para acerto. Obrigado! 🔧{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Olá {primeiro_nome}! Confirmamos o recebimento da sua mensalidade ({plano}) no valor de {valor}{metodo_pagamento_texto}. Manutenção e suporte garantidos! Obrigado pela parceria! 🤝{assinatura}',
};

// 4. Saúde & Consultórios
export const HEALTH_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar do acerto referente à sua consulta/sessão no valor de {valor}{vencimento_texto}. Seguem as informações para pagamento via Pix quando for conveniente. Agradeço pela confiança! 🩺💙{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Seguem os dados para o acerto da sua consulta/atendimento no valor de {valor}{vencimento_texto}. Qualquer dúvida sobre o recibo ou demonstrativo, estou à disposição! 🩺{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto referente aos atendimentos clínicos no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou nos contatar para organizarmos o acerto.{bloco_pix}{assinatura}',
  creditReceipt:
    'Olá {primeiro_nome}, agradecemos a sua presença na consulta de hoje!\n\nRegistramos seu atendimento:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nConte sempre conosco para cuidar da sua saúde e bem-estar! 🩺💙{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz cerca de {dias_ultima_visita} dias desde a sua última consulta. Como você tem passado? Lembre-se de que a continuidade e o acompanhamento regular são essenciais para os seus resultados. Se desejar agendar o retorno, estou à disposição! 🩺{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Como está sua semana? Chegamos ao período ideal para o seu retorno e acompanhamento ({dias_ultima_visita} dias). Se desejar verificar os horários disponíveis desta semana, me avise por aqui! 💙{assinatura}',
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz mais de {dias_ultima_visita} dias desde o nosso último encontro clínico. Espero que esteja tudo bem com você! Se precisar retomar o acompanhamento ou tirar dúvidas, as portas estão sempre abertas! 🩺{assinatura}',
  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Passando para lembrar que cuidar da sua saúde é uma prioridade diária. Já faz algum tempo desde sua última sessão. Que tal agendarmos uma avaliação para vermos sua evolução? Estou à disposição! 💙{assinatura}',
  birthdayCasual:
    'Olá {primeiro_nome}, parabéns pelo seu dia! 🎂🎉 Que este novo ciclo traga muita saúde, equilíbrio, paz e realizações. Um abraço caloroso! 🩺💙{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! 🎂 Desejo a você um feliz aniversário com muita saúde e bem-estar! Para celebrar o seu dia, preparei um benefício especial para sua próxima consulta deste mês. Conte sempre conosco! 🎁💙{assinatura}',
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar da mensalidade do seu plano de acompanhamento ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue chave Pix para acerto. Agradeço pela parceria com sua saúde! 🩺{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Olá {primeiro_nome}! Confirmamos o recebimento da mensalidade do seu plano ({plano}) no valor de {valor}{metodo_pagamento_texto}! Seguimos juntos no seu cuidado contínuo! Muito obrigado! 💙{assinatura}',
};

// 5. Aulas, Treinamento & Consultoria
export const TRAINING_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Fala {primeiro_nome}, tudo bem? Passando para lembrar do seu acerto referente às aulas/treinos no valor de {valor}{vencimento_texto}. Seguem os dados para Pix quando puder. Vamos com tudo para os objetivos! 💪🔥{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Segue a atualização do seu saldo de aulas/sessões no valor de {valor}{vencimento_texto}. Dados para pagamento abaixo. Foco total na consistência! 💪{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação para mantermos o cronograma de aulas regularizado.{bloco_pix}{assinatura}',
  creditReceipt:
    'Fala {primeiro_nome}! Treino/aula de hoje concluído com sucesso! 🎯\n\nRegistramos seu pacote/sessões:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nFoco na evolução e até a próxima! 💪🔥{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Fala {primeiro_nome}, tudo na paz? Já faz cerca de {dias_ultima_visita} dias desde a sua última sessão. A consistência é a chave para o resultado! Bora agendar os próximos treinos/aulas dessa semana? 💪🎯{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Como está o ritmo? Notamos que seu ciclo de aulas está no momento ideal ({dias_ultima_visita} dias). Me avise para eu já garantir a sua grade de horários desta semana! Vamos juntos! 🔥{assinatura}',
  inactiveRecoveryCasual:
    'Fala {primeiro_nome}, sumiu dos treinos/aulas! Já faz mais de {dias_ultima_visita} dias que não nos vemos. Como estão as coisas? Bora retomar o ritmo e buscar as metas juntos? Estou te esperando! 💪{assinatura}',
  inactiveRecoveryPromo:
    'Fala {primeiro_nome}! Sentimos sua falta nos treinos! Não deixe o desânimo vencer. Preparei uma condição especial de reativação para você voltar com força total esse mês! Bora pra cima? 🔥{assinatura}',
  birthdayCasual:
    'Fala {primeiro_nome}, parabéns pelo seu aniversário! 🎂🎉 Muita energia, saúde, foco e vitórias no seu novo ciclo! Tmj sempre! 💪🔥{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje o dia é seu! 🎂💪 Passando para desejar um aniversário incrível e te presentear com uma sessão/aula bônus especial pra você comemorar em grande estilo! Bora marcar? 🎁🔥{assinatura}',
  subscriptionInvoice:
    'Fala {primeiro_nome}, tudo bem? Passando para lembrar da mensalidade do seu plano ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue nossa chave Pix para acerto. Bora manter o foco na evolução! 💪{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Fala {primeiro_nome}! Confirmamos o recebimento da mensalidade do seu plano ({plano}) no valor de {valor}{metodo_pagamento_texto}! Valeu demais pela parceria e confiança! Seguimos focados no topo! 💪🔥{assinatura}',
};

// 6. Comércio Rápido & Autônomos em Geral
export const COMMERCE_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar do seu acerto referente às suas compras no valor de {valor}{vencimento_texto}. Seguem as informações para pagamento via Pix quando for conveniente. Agradecemos pela preferência! 🛍️{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Segue a atualização do seu saldo pendente de compras no valor de {valor}{vencimento_texto}. Dados para pagamento abaixo. Qualquer dúvida sobre o pedido, estamos à disposição! 📦{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto referente aos pedidos/mercadorias no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou nos contatar para combinarmos o pagamento.{bloco_pix}{assinatura}',
  creditReceipt:
    'Olá {primeiro_nome}! Muito obrigado pela compra!\n\nRegistramos seu pedido a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nEsperamos que aproveite muito! Qualquer dúvida estamos por aqui! 🛍️✨{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz cerca de {dias_ultima_visita} dias desde sua última comprinha com a gente. Recebemos várias novidades incríveis essa semana! Que tal dar uma conferida? 🛍️✨{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Notamos que faz cerca de {dias_ultima_visita} dias desde sua última visita. Como você é um cliente especial, separamos novidades exclusivas que combinam com o seu gosto! Dê uma olhadinha! 📦✨{assinatura}',
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, quanto tempo! Já faz mais de {dias_ultima_visita} dias que você não dá uma passada por aqui. Sentimos sua falta! Que tal conferir as novidades que acabaram de chegar? 🛍️{assinatura}',
  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Sentimos muito a sua falta! Temos um desconto especial exclusivo para você usar na sua próxima compra esta semana. Aproveite para garantir seus produtos favoritos! 🎁🛍️{assinatura}',
  birthdayCasual:
    'Olá {primeiro_nome}, parabéns pelo seu aniversário! 🎂🎉 Desejamos um dia muito especial, repleto de alegria, saúde e prosperidade! Conte sempre com a gente! 🛍️✨{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje é o seu dia especial! 🎂✨ Para celebrar o seu aniversário, você tem um desconto exclusivo de presente na sua próxima compra este mês! Venha comemorar com a gente! 🎁🛍️{assinatura}',
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar da mensalidade da sua assinatura ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue chave Pix para acerto. Obrigado pela parceria! 🛍️{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Olá {primeiro_nome}! Confirmamos o recebimento da sua mensalidade ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigado pela preferência e confiança! 📦✨{assinatura}',
};

// 7. Geral / Neutro
export const DEFAULT_NEUTRAL_TEMPLATES: SegmentWhatsAppTemplates = {
  friendly:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar do seu acerto de {valor}{vencimento_texto}. Seguem os dados para acerto via Pix quando puder. Agradecemos pela parceria!{bloco_pix}{assinatura}',
  default:
    'Olá {primeiro_nome}, tudo bem? Passando para atualizar o seu saldo pendente de {valor}{vencimento_texto}. Seguem as informações para acerto. Qualquer dúvida estou à disposição!{bloco_pix}{assinatura}',
  firm:
    'Olá {nome}, tudo bem? Consta uma pendência financeira em aberto no valor de {valor}{atraso_texto}. Solicitamos a gentileza de realizar a quitação ou entrar em contato para combinarmos o acerto o quanto antes.{bloco_pix}{assinatura}',
  creditReceipt:
    'Olá {primeiro_nome}, muito obrigado pela preferência!\n\nRegistramos seu atendimento a prazo:\n{itens}\nTotal: {valor}\nCombinado para: {vencimento}\n\nQualquer dúvida estou à disposição!{bloco_pix}{assinatura}',
  returnWindowCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz cerca de {dias_ultima_visita} dias desde o seu último atendimento com a gente. Como estão as coisas? Se precisar agendar novos serviços, estamos à disposição!{assinatura}',
  returnWindowVip:
    'Olá {primeiro_nome}! Como está sua semana? Notamos que seu ciclo de atendimento está no momento ideal ({dias_ultima_visita} dias). Se desejar agendar seu próximo horário com prioridade, estou à disposição!{assinatura}',
  inactiveRecoveryCasual:
    'Olá {primeiro_nome}, tudo bem? Já faz mais de {dias_ultima_visita} dias desde a sua última visita. Estamos à disposição caso precise de novos atendimentos ou serviços!{assinatura}',
  inactiveRecoveryPromo:
    'Olá {primeiro_nome}! Sentimos sua falta por aqui. Que tal agendar seu próximo atendimento essa semana? Temos condições especiais esperando por você!{assinatura}',
  birthdayCasual:
    'Olá {primeiro_nome}, parabéns pelo seu aniversário! 🎂🎉 Muita saúde, paz e sucesso! Que seu novo ciclo seja repleto de realizações!{assinatura}',
  birthdayGift:
    'Parabéns {primeiro_nome}! Hoje é o seu dia! 🎂 Passando para desejar um feliz aniversário e um novo ciclo repleto de conquistas! Conte sempre com a gente!{assinatura}',
  subscriptionInvoice:
    'Olá {primeiro_nome}, tudo bem? Passando para lembrar da sua mensalidade ({plano}) no valor de {valor}, com vencimento em {vencimento}. Segue a nossa chave para acerto via Pix. Obrigado pela parceria!{bloco_pix}{assinatura}',
  subscriptionReceipt:
    'Olá {primeiro_nome}, tudo bem? Confirmamos o recebimento da sua mensalidade ({plano}) no valor de {valor}{metodo_pagamento_texto}! Muito obrigado pela confiança e parceria de sempre!{assinatura}',
};

export const ALL_SEGMENT_TEMPLATES: Record<BusinessSegment, SegmentWhatsAppTemplates> = {
  barbearia: BARBER_TEMPLATES,
  beleza_estetica: BEAUTY_TEMPLATES,
  servicos_manutencao: MAINTENANCE_TEMPLATES,
  saude_consultorio: HEALTH_TEMPLATES,
  aulas_treinamento: TRAINING_TEMPLATES,
  comercio_geral: COMMERCE_TEMPLATES,
  outro: DEFAULT_NEUTRAL_TEMPLATES,
};

export function getTemplatesForSegment(segment?: string | null): SegmentWhatsAppTemplates {
  if (segment && segment in ALL_SEGMENT_TEMPLATES) {
    return ALL_SEGMENT_TEMPLATES[segment as BusinessSegment];
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
