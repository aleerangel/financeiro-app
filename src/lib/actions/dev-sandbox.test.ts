import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSandboxAccount } from './dev-sandbox';

describe('dev-sandbox', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('bloqueia a execução se o ambiente for produção', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'production';

    await expect(
      createSandboxAccount({ mode: 'clean' })
    ).rejects.toThrow('O modo Dev Sandbox só está disponível no ambiente local de desenvolvimento.');
  });
});
