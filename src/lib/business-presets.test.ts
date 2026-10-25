import { describe, it, expect } from 'vitest';
import {
  SEGMENTS_CONFIG,
  ALL_SEGMENTS,
  getSegmentConfig,
  resolveBusinessProfile,
  formatSalesUnit,
  formatSplitCount,
} from './business-presets';

describe('business-presets', () => {
  it('deve conter os 7 segmentos configurados (5 macro-segmentos + barbearia + outro)', () => {
    expect(ALL_SEGMENTS.length).toBe(7);
    expect(SEGMENTS_CONFIG.barbearia).toBeDefined();
    expect(SEGMENTS_CONFIG.beleza_estetica).toBeDefined();
    expect(SEGMENTS_CONFIG.servicos_manutencao).toBeDefined();
    expect(SEGMENTS_CONFIG.saude_consultorio).toBeDefined();
    expect(SEGMENTS_CONFIG.aulas_treinamento).toBeDefined();
    expect(SEGMENTS_CONFIG.comercio_geral).toBeDefined();
    expect(SEGMENTS_CONFIG.outro).toBeDefined();
  });

  it('deve retornar a configuração correta para cada segmento', () => {
    const barbearia = getSegmentConfig('barbearia');
    expect(barbearia.defaultSalesLabel).toBe('Atendimentos');
    expect(barbearia.defaultCycleDays).toBe(21);

    const manutencao = getSegmentConfig('servicos_manutencao');
    expect(manutencao.defaultSalesLabel).toBe('Ordens de Serviço');
    expect(manutencao.defaultCycleDays).toBe(90);

    const saude = getSegmentConfig('saude_consultorio');
    expect(saude.defaultSalesLabel).toBe('Consultas');
    expect(saude.defaultCycleDays).toBe(30);

    const aulas = getSegmentConfig('aulas_treinamento');
    expect(aulas.defaultSalesLabel).toBe('Aulas & Sessões');
    expect(aulas.defaultCycleDays).toBe(7);
  });

  it('deve aplicar fallback para "outro" caso o segmento seja inválido ou nulo', () => {
    // @ts-expect-error testando valor inválido em tempo de execução
    const invalid = getSegmentConfig('invalido_xyz');
    expect(invalid.id).toBe('outro');
    expect(invalid.defaultSalesLabel).toBe('Atendimentos');

    const nullSeg = getSegmentConfig(null);
    expect(nullSeg.id).toBe('outro');
  });

  it('deve resolver perfil padrão com fallback seguro se o perfil vier nulo', () => {
    const profile = resolveBusinessProfile(null, 'teste@exemplo.com');
    expect(profile.business_name).toBe('Negócio de teste');
    expect(profile.segment).toBe('barbearia');
    expect(profile.has_business).toBe(true);
    expect(profile.sales_label).toBe('Atendimentos');
  });

  it('deve preservar campos existentes e aplicar defaults para campos ausentes', () => {
    const profile = resolveBusinessProfile({
      user_id: 'user-123',
      business_name: 'Oficina do Zé',
      segment: 'servicos_manutencao',
      has_business: true,
      onboarding_completed: true,
    });

    expect(profile.user_id).toBe('user-123');
    expect(profile.business_name).toBe('Oficina do Zé');
    expect(profile.segment).toBe('servicos_manutencao');
    expect(profile.sales_label).toBe('Ordens de Serviço');
    expect(profile.default_cycle_days).toBe(90);
    expect(profile.onboarding_completed).toBe(true);
  });

  it('deve respeitar customização do usuário para sales_label e default_cycle_days', () => {
    const profile = resolveBusinessProfile({
      user_id: 'user-456',
      business_name: 'Estúdio Fitness',
      segment: 'aulas_treinamento',
      sales_label: 'Treinos VIP',
      default_cycle_days: 14,
    });

    expect(profile.sales_label).toBe('Treinos VIP');
    expect(profile.default_cycle_days).toBe(14);
  });

  describe('formatSalesUnit & formatSplitCount', () => {
    it('deve formatar unidade de vendas/atendimentos singular e plural por segmento', () => {
      // Barbearia / Beleza
      expect(formatSalesUnit(1, 'Atendimentos')).toBe('atendimento');
      expect(formatSalesUnit(11, 'Atendimentos')).toBe('atendimentos');

      // Vendas / Comércio
      expect(formatSalesUnit(1, 'Vendas & Pedidos')).toBe('venda');
      expect(formatSalesUnit(11, 'Vendas & Pedidos')).toBe('vendas');

      // Ordens de Serviço
      expect(formatSalesUnit(1, 'Ordens de Serviço')).toBe('ordem de serviço');
      expect(formatSalesUnit(5, 'Ordens de Serviço')).toBe('ordens de serviço');

      // Consultas
      expect(formatSalesUnit(1, 'Consultas')).toBe('consulta');
      expect(formatSalesUnit(8, 'Consultas')).toBe('consultas');

      // Aulas & Sessões
      expect(formatSalesUnit(1, 'Aulas & Sessões')).toBe('sessão');
      expect(formatSalesUnit(12, 'Aulas & Sessões')).toBe('sessões');
    });

    it('deve gerar texto contextual de divisão de faturamento (ex.: 17 serviços em 11 atendimentos)', () => {
      // Caso real: 17 serviços em 11 atendimentos (barbearia)
      expect(formatSplitCount(17, 'service', 11, 'Atendimentos')).toBe('17 serviços em 11 atendimentos');
      expect(formatSplitCount(1, 'service', 1, 'Atendimentos')).toBe('1 serviço em 1 atendimento');
      expect(formatSplitCount(0, 'service', 11, 'Atendimentos')).toBe('0 serviços realizados');

      // Caso comércio: 17 produtos em 11 vendas
      expect(formatSplitCount(17, 'product', 11, 'Vendas')).toBe('17 produtos em 11 vendas');
      expect(formatSplitCount(1, 'product', 1, 'Vendas')).toBe('1 produto em 1 venda');
      expect(formatSplitCount(0, 'product', 11, 'Vendas')).toBe('0 produtos vendidos');

      // Caso ordens de serviço
      expect(formatSplitCount(8, 'service', 5, 'Ordens de Serviço')).toBe('8 serviços em 5 ordens de serviço');
    });
  });
});
