import { describe, it, expect } from 'vitest';
import { cleanCNPJ, formatCNPJ, isValidCNPJ } from './cnpj-utils';

describe('cnpj-utils', () => {
  describe('cleanCNPJ', () => {
    it('remove caracteres não numéricos', () => {
      expect(cleanCNPJ('11.222.333/0001-81')).toBe('11222333000181');
      expect(cleanCNPJ(null)).toBe('');
      expect(cleanCNPJ(undefined)).toBe('');
      expect(cleanCNPJ('abc123def')).toBe('123');
    });
  });

  describe('formatCNPJ', () => {
    it('formata progressivamente conforme a digitação', () => {
      expect(formatCNPJ('1')).toBe('1');
      expect(formatCNPJ('11')).toBe('11');
      expect(formatCNPJ('112')).toBe('11.2');
      expect(formatCNPJ('11222')).toBe('11.222');
      expect(formatCNPJ('112223')).toBe('11.222.3');
      expect(formatCNPJ('11222333')).toBe('11.222.333');
      expect(formatCNPJ('112223330001')).toBe('11.222.333/0001');
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('trunca em 14 dígitos', () => {
      expect(formatCNPJ('11222333000181999')).toBe('11.222.333/0001-81');
    });
  });

  describe('isValidCNPJ', () => {
    it('valida CNPJs válidos conhecidos', () => {
      // CNPJ Banco do Brasil
      expect(isValidCNPJ('00.000.000/0001-91')).toBe(true);
      expect(isValidCNPJ('00000000000191')).toBe(true);

      // CNPJ Petrobras
      expect(isValidCNPJ('33.000.167/0001-01')).toBe(true);

      // CNPJ Nubank
      expect(isValidCNPJ('18.236.120/0001-58')).toBe(true);
    });

    it('rejeita CNPJs com tamanho incorreto', () => {
      expect(isValidCNPJ('123')).toBe(false);
      expect(isValidCNPJ('11.222.333/0001-8')).toBe(false);
      expect(isValidCNPJ('')).toBe(false);
      expect(isValidCNPJ(null)).toBe(false);
    });

    it('rejeita sequências de dígitos repetidos', () => {
      expect(isValidCNPJ('00.000.000/0000-00')).toBe(false);
      expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
      expect(isValidCNPJ('99.999.999/9999-99')).toBe(false);
    });

    it('rejeita CNPJs com dígitos verificadores incorretos', () => {
      expect(isValidCNPJ('00.000.000/0001-92')).toBe(false);
      expect(isValidCNPJ('18.236.120/0001-59')).toBe(false);
    });
  });
});
