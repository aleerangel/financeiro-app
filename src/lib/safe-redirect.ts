/**
 * Valida e sanitiza caminhos de redirecionamento interno para prevenir ataques de Open Redirect.
 * Permite apenas caminhos relativos válidos iniciados por '/' e rejeita:
 * - Redirecionamentos com protocolo (http://, https://, javascript:, data:)
 * - Barras duplas ou invertidas (//evil.com, /\evil.com, \evil.com)
 * - Caracteres de controle de URL com credenciais (@evil.com)
 */
export function getSafeRedirectPath(
  rawPath: string | null | undefined,
  defaultPath = '/dashboard'
): string {
  if (!rawPath) return defaultPath;
  const trimmed = rawPath.trim();

  // Rejeita strings vazias ou sem barra inicial
  if (!trimmed.startsWith('/')) {
    return defaultPath;
  }

  // Previne '//evil.com', '/\evil.com', '/@evil.com' e qualquer barra invertida ou arroba
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/@') ||
    trimmed.includes('\\') ||
    trimmed.includes('@')
  ) {
    return defaultPath;
  }

  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);

    // Garante que o origin não foi alterado e que permanece o caminho relativo
    if (parsed.origin !== dummyOrigin) {
      return defaultPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultPath;
  }
}

