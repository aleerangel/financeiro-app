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
});
