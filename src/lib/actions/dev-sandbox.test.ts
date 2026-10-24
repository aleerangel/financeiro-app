import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSandboxAccount } from './dev-sandbox';
import { DEV_CLEAN_EMAIL, DEV_DEMO_EMAIL, DEV_PASSWORD } from '@/lib/dev-sandbox-constants';

describe('dev-sandbox', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('exporta credenciais fixas de sandbox para evitar poluição do banco', () => {
    expect(DEV_CLEAN_EMAIL).toBe('dev_zerada@canario.app');
    expect(DEV_DEMO_EMAIL).toBe('dev_demo@canario.app');
    expect(DEV_PASSWORD).toBeDefined();
    expect(DEV_PASSWORD.length).toBeGreaterThan(8);
  });

  it('bloqueia a execução se o ambiente for produção', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'production';

    await expect(
      createSandboxAccount({ mode: 'clean' })
    ).rejects.toThrow('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');

    await expect(
      createSandboxAccount({ mode: 'demo' })
    ).rejects.toThrow('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');
  });
});
