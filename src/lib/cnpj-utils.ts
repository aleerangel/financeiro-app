/**
 * Utilitários para formatação, limpeza e validação matemática de CNPJ (Receita Federal do Brasil).
 */

/**
 * Remove qualquer caractere não numérico da string de CNPJ.
 */
export function cleanCNPJ(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Aplica máscara de CNPJ progressivamente (XX.XXX.XXX/XXXX-XX).
 */
export function formatCNPJ(value: string | null | undefined): string {
  const digits = cleanCNPJ(value).slice(0, 14);
  if (!digits) return '';

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação matemática dos dois dígitos verificadores do CNPJ (algoritmo Módulo 11 da Receita Federal).
 */
export function isValidCNPJ(value: string | null | undefined): boolean {
  const cnpj = cleanCNPJ(value);

  // CNPJ precisa ter exatamente 14 dígitos
  if (cnpj.length !== 14) {
    return false;
  }

  // Rejeita sequências de dígitos iguais conhecidas (ex: 00000000000000, 11111111111111)
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  // 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += Number(cnpj[i]) * weights1[i];
  }
  const rest1 = sum1 % 11;
  const digit1 = rest1 < 2 ? 0 : 11 - rest1;

  if (Number(cnpj[12]) !== digit1) {
    return false;
  }

  // 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += Number(cnpj[i]) * weights2[i];
  }
  const rest2 = sum2 % 11;
  const digit2 = rest2 < 2 ? 0 : 11 - rest2;

  return Number(cnpj[13]) === digit2;
}
