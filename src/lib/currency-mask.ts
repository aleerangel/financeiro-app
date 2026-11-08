/**
 * Utilitários de máscara monetária estilo Banking (centavos da direita para a esquerda).
 * Exemplos:
 *   "5"      -> "0,05"  (0.05)
 *   "50"     -> "0,50"  (0.50)
 *   "500"    -> "5,00"  (5.00)
 *   "5000"   -> "50,00" (50.00)
 *   "500000" -> "5.000,00" (5000.00)
 */

const MAX_DIGITS = 13; // Suporta valores até R$ 999.999.999,99

/**
 * Converte qualquer entrada de texto ou número em string de dígitos puros.
 */
export function extractDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'number' ? Math.round(value * 100).toString() : value.toString();
  return str.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/**
 * Formata um valor numérico em centavos inteiros para string no padrão brasileiro (pt-BR).
 */
export function centsToCurrencyString(cents: number): string {
  if (isNaN(cents) || cents <= 0) return '0,00';
  const num = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Aplica a máscara bancária sobre uma entrada de texto.
 * Se a entrada estiver vazia (sem dígitos), retorna formatted: ''.
 * Caso contrário, formata os dígitos como centavos da direita para a esquerda.
 */
export function maskCurrencyInput(input: string | number | null | undefined): {
  formatted: string;
  numericValue: number;
  cents: number;
} {
  if (input === null || input === undefined) {
    return { formatted: '', numericValue: 0, cents: 0 };
  }

  // Se já for número passado diretamente
  if (typeof input === 'number') {
    if (isNaN(input) || input === 0) {
      return { formatted: '', numericValue: 0, cents: 0 };
    }
    const cents = Math.round(input * 100);
    return {
      formatted: centsToCurrencyString(cents),
      numericValue: input,
      cents,
    };
  }

  const digits = input.replace(/\D/g, '').slice(0, MAX_DIGITS);
  if (!digits) {
    return { formatted: '', numericValue: 0, cents: 0 };
  }

  const cents = parseInt(digits, 10);
  if (isNaN(cents) || cents === 0) {
    return { formatted: '', numericValue: 0, cents: 0 };
  }

  const numericValue = cents / 100;
  const formatted = centsToCurrencyString(cents);

  return { formatted, numericValue, cents };
}

/**
 * Formata um número existente (ex: 50 ou 50.5) para exibição inicial no input.
 * Se for 0 ou indefinido, pode retornar string vazia ou '0,00' conforme emptyAsBlank.
 */
export function numberToCurrencyInputString(
  val: number | string | null | undefined,
  emptyAsBlank = true
): string {
  if (val === null || val === undefined || val === '') {
    return emptyAsBlank ? '' : '0,00';
  }
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num) || num === 0) {
    return emptyAsBlank ? '' : '0,00';
  }
  return centsToCurrencyString(Math.round(num * 100));
}

/**
 * Converte string formatada de volta para número float para persistência no banco.
 * Exemplos: "50,00" -> 50 | "1.250,50" -> 1250.5 | "0,50" -> 0.5 | "" -> 0
 */
export function parseCurrencyInputToNumber(val: string | null | undefined): number {
  if (!val || typeof val !== 'string') return 0;
  const digits = val.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
