import { describe, it, expect } from 'vitest';
import {
  formatReceiptNumber,
  getSalePaymentMethodLabel,
  generateSaleReceiptWhatsAppText,
} from './sale-receipt-utils';
import { Sale, BusinessProfile, Account } from '@/types/database';
import { BusinessMessageSettings } from '@/lib/whatsapp-templates';

describe('sale-receipt-utils', () => {
  const mockProfile: BusinessProfile = {
    user_id: 'user-1',
    business_name: 'Barbearia Estilo & Corte',
    cnpj: '12345678000195',
    segment: 'barbearia',
    has_business: true,
    sales_label: 'Atendimentos',
    default_cycle_days: 21,
    onboarding_completed: true,
    legacy_migrated: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockSettings: BusinessMessageSettings = {
    pix_key_type: 'phone',
    pix_key: '(11) 99999-8888',
    pix_holder_name: 'Alexandre Rangel',
    template_friendly: '',
    template_default: '',
    template_firm: '',
    template_sale_credit_receipt: '',
    template_sale_receipt_friendly: '',
    template_return_window: '',
    template_return_window_vip: '',
    template_inactive_recovery: '',
    template_inactive_recovery_promo: '',
    template_birthday: '',
    template_birthday_gift: '',
    template_subscription_invoice: '',
    template_subscription_receipt: '',
    include_pix_default: true,
  };

  const mockSale: Sale = {
    id: 'sale-abc12345',
    user_id: 'user-1',
    client_name: 'Lucas Ferreira',
    total_amount: 80.0,
    paid_amount: 80.0,
    remaining_amount: 0,
    payment_method: 'pix',
    due_date: null,
    account_id: 'acc-1',
    transaction_id: null,
    sale_date: '2026-10-26T14:30:00Z',
    notes: 'Corte e barba alinhados',
    created_at: '2026-10-26T14:30:00Z',
    items: [
      {
        id: 'item-1',
        sale_id: 'sale-abc12345',
        product_id: 'prod-1',
        product_name: 'Corte Degradê',
        quantity: 1,
        unit_price: 45.0,
        total_price: 45.0,
        created_at: '2026-10-26',
      },
      {
        id: 'item-2',
        sale_id: 'sale-abc12345',
        product_id: 'prod-2',
        product_name: 'Barba Terapia',
        quantity: 1,
        unit_price: 35.0,
        total_price: 35.0,
        created_at: '2026-10-26',
      },
    ],
    client: {
      id: 'client-1',
      user_id: 'user-1',
      name: 'Lucas Ferreira',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      created_at: '2026-01-01',
    },
  };

  it('formats receipt number with year and clean ID', () => {
    const num = formatReceiptNumber('abcd-1234-xyz', '2026-10-26');
    expect(num).toBe('NF-2026-ABCD12');
  });

  it('translates payment methods correctly', () => {
    expect(getSalePaymentMethodLabel('pix')).toBe('PIX');
    expect(getSalePaymentMethodLabel('money')).toBe('Dinheiro em Espécie');
    expect(getSalePaymentMethodLabel('cash')).toBe('Dinheiro em Espécie');
    expect(getSalePaymentMethodLabel('credit_card')).toBe('Cartão de Crédito');
    expect(getSalePaymentMethodLabel('debit_card')).toBe('Cartão de Débito');
    expect(getSalePaymentMethodLabel('on_credit')).toBe('A Prazo / Fiado');
  });

  it('generates complete WhatsApp receipt text for fully paid sale', () => {
    const text = generateSaleReceiptWhatsAppText({
      sale: mockSale,
      businessProfile: mockProfile,
      messageSettings: mockSettings,
    });

    expect(text).toContain('COMPROVANTE DE SERVIÇO / VENDA');
    expect(text).toContain('Barbearia Estilo & Corte');
    expect(text).toContain('CNPJ: 12.345.678/0001-95');
    expect(text).toContain('Lucas Ferreira');
    expect(text).toContain('1x Corte Degradê');
    expect(text).toContain('1x Barba Terapia');
    expect(text).toContain('Total da Nota:');
    expect(text).toContain('80,00');
    expect(text).toContain('Forma de Pagamento:');
    expect(text).toContain('PIX');
    expect(text).toContain('Quitado integralmente');
    expect(text).toContain('(11) 99999-8888');
    expect(text).toContain('Alexandre Rangel');
  });

  it('generates WhatsApp text for on-credit / fiado sale with remaining amount', () => {
    const creditSale: Sale = {
      ...mockSale,
      payment_method: 'on_credit',
      paid_amount: 30.0,
      remaining_amount: 50.0,
      due_date: '2026-11-15',
      amortizations: [
        {
          id: 'am-1',
          sale_id: mockSale.id,
          account_id: 'acc-1',
          transaction_id: null,
          amount: 30.0,
          created_at: '2026-10-26T15:00:00Z',
          account: { id: 'acc-1', name: 'Caixa Principal' } as Account,
        },
      ],
    };

    const text = generateSaleReceiptWhatsAppText({
      sale: creditSale,
      businessProfile: mockProfile,
      messageSettings: mockSettings,
    });

    expect(text).toContain('A Prazo / Fiado');
    expect(text).toContain('Valor Pago:');
    expect(text).toContain('30,00');
    expect(text).toContain('Saldo em Aberto:');
    expect(text).toContain('50,00');
    expect(text).toContain('PAGAMENTOS / AMORTIZAÇÕES:');
  });
});
