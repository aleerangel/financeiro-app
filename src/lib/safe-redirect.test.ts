import { describe, it, expect } from 'vitest';
import { getSafeRedirectPath } from './safe-redirect';

describe('getSafeRedirectPath', () => {
  it('retorna o caminho seguro quando fornecido um path relativo válido', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/transacoes?tipo=receita')).toBe('/transacoes?tipo=receita');
    expect(getSafeRedirectPath('/vendas#topo')).toBe('/vendas#topo');
  });

  it('retorna o defaultPath quando nulo, vazio ou indefinido', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard');
    expect(getSafeRedirectPath(undefined)).toBe('/dashboard');
    expect(getSafeRedirectPath('')).toBe('/dashboard');
    expect(getSafeRedirectPath('   ', '/login')).toBe('/login');
  });

  it('bloqueia tentativas clássicas de Open Redirect com protocolo absoluto', () => {
    expect(getSafeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('http://attacker.org/phishing')).toBe('/dashboard');
    expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
    expect(getSafeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
  });

  it('bloqueia tentativas com barras duplas protocol-relative (//evil.com)', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('//attacker.org/test')).toBe('/dashboard');
  });

  it('bloqueia tentativas com barras invertidas (/\\evil.com ou \\evil.com)', () => {
    expect(getSafeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('\\evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('/path\\evil.com')).toBe('/dashboard');
  });

  it('bloqueia bypass com arroba de credencial de URL (/@evil.com ou /path@evil.com)', () => {
    expect(getSafeRedirectPath('/@evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('/dashboard@evil.com')).toBe('/dashboard');
  });
});
