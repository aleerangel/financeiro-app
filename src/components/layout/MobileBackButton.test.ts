import { describe, it, expect } from 'vitest';
import { isMoreModuleRoute, MORE_ROUTES } from './MobileBackButton';

describe('MobileBackButton - route recognition', () => {
  it('correctly defines the secondary routes of the More menu', () => {
    expect(MORE_ROUTES).toEqual([
      '/clientes',
      '/mensalidades',
      '/produtos',
      '/contas',
      '/cartoes',
      '/recorrencias',
      '/categorias',
    ]);
  });

  it('returns true for all more module routes and subroutes', () => {
    expect(isMoreModuleRoute('/clientes')).toBe(true);
    expect(isMoreModuleRoute('/clientes/novo')).toBe(true);
    expect(isMoreModuleRoute('/mensalidades')).toBe(true);
    expect(isMoreModuleRoute('/produtos')).toBe(true);
    expect(isMoreModuleRoute('/produtos/editar')).toBe(true);
    expect(isMoreModuleRoute('/contas')).toBe(true);
    expect(isMoreModuleRoute('/cartoes')).toBe(true);
    expect(isMoreModuleRoute('/recorrencias')).toBe(true);
    expect(isMoreModuleRoute('/categorias')).toBe(true);
  });

  it('returns false for primary dashboard routes and auth routes', () => {
    expect(isMoreModuleRoute('/dashboard')).toBe(false);
    expect(isMoreModuleRoute('/transacoes')).toBe(false);
    expect(isMoreModuleRoute('/vendas')).toBe(false);
    expect(isMoreModuleRoute('/login')).toBe(false);
    expect(isMoreModuleRoute('/')).toBe(false);
    expect(isMoreModuleRoute('')).toBe(false);
  });
});

