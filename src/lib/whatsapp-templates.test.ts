import { describe, it, expect } from 'vitest';
import {
  renderWhatsAppTemplate,
  formatPixBlock,
  DEFAULT_TEMPLATES,
  SYSTEM_WHATSAPP_SIGNATURE,
} from './whatsapp-templates';

describe('whatsapp-templates', () => {
  it('renderiza template amigável com substituições corretas', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.friendly,
      {
        nome: 'Carlos Eduardo',
        valor: 'R$ 50,00',
        vencimento: '30/10/2026',
      },
      false
    );

    expect(text).toContain('Carlos');
    expect(text).toContain('R$ 50,00');
    expect(text).toContain('combinado para 30/10/2026');
    expect(text).toContain(SYSTEM_WHATSAPP_SIGNATURE);
  });

  it('anexa bloco Pix quando includePix for true e chave existir', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.default,
      {
        nome: 'João Silva',
        valor: 'R$ 75,00',
      },
      true,
      {
        key: '11999998888',
        keyType: 'phone',
        holderName: 'Barbearia Top',
      }
    );

    expect(text).toContain('11999998888');
    expect(text).toContain('Barbearia Top');
    expect(text).toContain(SYSTEM_WHATSAPP_SIGNATURE);
  });

  it('renderiza template firme com dias de atraso', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.firm,
      {
        nome: 'Marcos Paulo',
        valor: 'R$ 120,00',
        dias_atraso: 15,
      },
      false
    );

    expect(text).toContain('Marcos Paulo');
    expect(text).toContain('R$ 120,00');
    expect(text).toContain('vencido há 15 dias');
  });

  it('formata o bloco Pix corretamente com tipo e titular', () => {
    const block = formatPixBlock('123.456.789-00', 'cpf', 'Alexandre Rangel');
    expect(block).toContain('123.456.789-00');
    expect(block).toContain('CPF');
    expect(block).toContain('(Alexandre Rangel)');
  });

  it('renderiza recibo de venda a prazo com itens e vencimento', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.creditReceipt,
      {
        nome: 'Felipe Santos',
        valor: 'R$ 90,00',
        itens: '- 1x Corte Degradê\n- 1x Pomada Matte',
        vencimento: '15/11/2026',
      },
      true,
      {
        key: 'barber@fin.com',
        keyType: 'email',
      }
    );

    expect(text).toContain('Felipe');
    expect(text).toContain('Corte Degradê');
    expect(text).toContain('R$ 90,00');
    expect(text).toContain('barber@fin.com');
    expect(text).toContain('15/11/2026');
  });

  it('renderiza template de radar de retorno com dias desde o último corte', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.returnWindowCasual,
      {
        nome: 'Guilherme Castro',
        dias_ultima_visita: 22,
      },
      false
    );

    expect(text).toContain('Guilherme');
    expect(text).toContain('22 dias');
    expect(text).toContain('renovar o visual');
    expect(text).toContain(SYSTEM_WHATSAPP_SIGNATURE);
  });

  it('renderiza template de resgate de inativo', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.inactiveRecoveryCasual,
      {
        nome: 'Rodrigo Lima',
        dias_ultima_visita: 60,
      },
      false
    );

    expect(text).toContain('Rodrigo');
    expect(text).toContain('sumiu');
    expect(text).toContain('60 dias');
  });

  it('renderiza template de aniversário', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.birthdayCasual,
      {
        nome: 'Gabriel Pires',
      },
      false
    );

    expect(text).toContain('Gabriel');
    expect(text).toContain('parabéns');
    expect(text).toContain('🎂');
  });

  it('renderiza template de mensalidade de clube com plano, valor e Pix', () => {
    const text = renderWhatsAppTemplate(
      DEFAULT_TEMPLATES.subscriptionInvoice,
      {
        nome: 'Felipe Santos',
        plano: 'Clube do Corte Semanal',
        valor: 'R$ 80,00',
        vencimento: '10/11/2026',
      },
      true,
      {
        key: 'barbearia@pix.com',
        keyType: 'email',
        holderName: 'Barbearia VIP',
      }
    );

    expect(text).toContain('Felipe');
    expect(text).toContain('Clube do Corte Semanal');
    expect(text).toContain('R$ 80,00');
    expect(text).toContain('10/11/2026');
    expect(text).toContain('barbearia@pix.com');
    expect(text).toContain('Barbearia VIP');
    expect(text).toContain(SYSTEM_WHATSAPP_SIGNATURE);
  });
});

