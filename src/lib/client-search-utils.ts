import { SimpleClient } from './actions/clients';

/**
 * Remove acentos, caracteres diacríticos e converte para minúsculas sem espaços extras
 */
export function normalizeSearchTerm(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filtra clientes de forma inteligente e rápida:
 * 1. Insensível a acentos e maiúsculas/minúsculas (ex: "joao" encontra "João")
 * 2. Multi-termo: palavras digitadas podem aparecer em qualquer ordem
 * 3. Busca por dígitos do telefone (ex: "9876" encontra "(11) 98765-4321")
 * 4. Prioriza clientes cujo nome começa com o termo digitado
 */
export function filterClientsBySearch(
  clients: SimpleClient[],
  searchTerm: string,
  limit = 8
): SimpleClient[] {
  const normalizedSearch = normalizeSearchTerm(searchTerm);
  if (!normalizedSearch) {
    return clients.slice(0, limit);
  }

  const digitsOnlySearch = searchTerm.replace(/\D/g, '');
  const terms = normalizedSearch.split(/\s+/).filter(Boolean);

  const matched = clients.filter((client) => {
    const clientNameNorm = normalizeSearchTerm(client.name);
    const clientPhoneDigits = (client.phone || '').replace(/\D/g, '');

    // 1. Busca por telefone se digitou ao menos 2 dígitos
    if (digitsOnlySearch.length >= 2 && clientPhoneDigits.includes(digitsOnlySearch)) {
      return true;
    }

    // 2. Busca por nome com multi-termos
    return terms.every((term) => clientNameNorm.includes(term));
  });

  // Ordena por relevância (prefixo primeiro)
  matched.sort((a, b) => {
    const aNorm = normalizeSearchTerm(a.name);
    const bNorm = normalizeSearchTerm(b.name);
    const aStarts = aNorm.startsWith(normalizedSearch);
    const bStarts = bNorm.startsWith(normalizedSearch);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return aNorm.localeCompare(bNorm);
  });

  return matched.slice(0, limit);
}

/**
 * Tenta encontrar um cliente que corresponda exatamente ao nome digitado
 * (ignorando acentuação, espaços extras e maiúsculas/minúsculas)
 */
export function findExactClientMatch(
  clients: SimpleClient[],
  searchTerm: string
): SimpleClient | undefined {
  const norm = normalizeSearchTerm(searchTerm);
  if (!norm) return undefined;

  return clients.find((c) => normalizeSearchTerm(c.name) === norm);
}
