import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAppClientStorage } from './auth-storage';

describe('auth-storage - clearAppClientStorage', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    const store = new Map<string, string>();
    const sessionStore = new Map<string, string>();

    const createStorageMock = (map: Map<string, string>) => ({
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, String(value)),
      removeItem: (key: string) => map.delete(key),
      clear: () => map.clear(),
      key: (index: number) => Array.from(map.keys())[index] ?? null,
      get length() {
        return map.size;
      },
    });

    // Mock global window
    (global as unknown as { window: unknown }).window = {
      localStorage: createStorageMock(store),
      sessionStorage: createStorageMock(sessionStore),
    };
  });

  afterEach(() => {
    (global as unknown as { window: unknown }).window = originalWindow;
  });

  it('removes only financeiro and supabase related items from localStorage', () => {
    window.localStorage.setItem('financeiro_mobile_context_mode', 'business');
    window.localStorage.setItem('financeiro_mobile_show_values', 'true');
    window.localStorage.setItem('sb-12345-auth-token', 'secret-token');
    window.localStorage.setItem('supabase.auth.token', 'legacy-token');
    window.localStorage.setItem('other_unrelated_extension_key', 'keep_this_safe');
    window.sessionStorage.setItem('temp_session_key', 'session_data');

    clearAppClientStorage();

    expect(window.localStorage.getItem('financeiro_mobile_context_mode')).toBeNull();
    expect(window.localStorage.getItem('financeiro_mobile_show_values')).toBeNull();
    expect(window.localStorage.getItem('sb-12345-auth-token')).toBeNull();
    expect(window.localStorage.getItem('supabase.auth.token')).toBeNull();

    // Outros dados não são apagados
    expect(window.localStorage.getItem('other_unrelated_extension_key')).toBe('keep_this_safe');
    // SessionStorage é limpo
    expect(window.sessionStorage.getItem('temp_session_key')).toBeNull();
  });

  it('handles server-side environments where window is undefined gracefully', () => {
    (global as unknown as { window: unknown }).window = undefined;
    expect(() => clearAppClientStorage()).not.toThrow();
  });
});

