/**
 * Cache em memória no cliente para eliminar latência de rede (0ms)
 * ao abrir gavetas rápidas, modais de transação, rendimento e navegação entre meses.
 */

import { getAccounts, AccountWithBalance } from './actions/accounts';
import { getCreditCards, CreditCardWithUsage } from './actions/credit-cards';
import { getCategories } from './actions/categories';
import { getProducts } from './actions/products';
import { getSimpleClients, SimpleClient } from './actions/clients';
import { Category, Product } from '@/types/database';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos de validade padrão

let cachedAccounts: CacheEntry<AccountWithBalance[]> | null = null;
let cachedCards: CacheEntry<CreditCardWithUsage[]> | null = null;
let cachedCategories: CacheEntry<Category[]> | null = null;
let cachedProducts: CacheEntry<Product[]> | null = null;
let cachedClients: CacheEntry<SimpleClient[]> | null = null;

export function seedClientCache(params: {
  accounts?: AccountWithBalance[];
  cards?: CreditCardWithUsage[];
  categories?: Category[];
}) {
  const now = Date.now();
  if (params.accounts) cachedAccounts = { data: params.accounts, timestamp: now };
  if (params.cards) cachedCards = { data: params.cards, timestamp: now };
  if (params.categories) cachedCategories = { data: params.categories, timestamp: now };
}

export async function getCachedAccounts(force = false): Promise<AccountWithBalance[]> {
  const now = Date.now();
  if (!force && cachedAccounts && now - cachedAccounts.timestamp < CACHE_TTL_MS) {
    return cachedAccounts.data;
  }
  const data = await getAccounts();
  cachedAccounts = { data, timestamp: now };
  return data;
}

export async function getCachedCreditCards(force = false): Promise<CreditCardWithUsage[]> {
  const now = Date.now();
  if (!force && cachedCards && now - cachedCards.timestamp < CACHE_TTL_MS) {
    return cachedCards.data;
  }
  const data = await getCreditCards();
  cachedCards = { data, timestamp: now };
  return data;
}

export async function getCachedCategories(force = false): Promise<Category[]> {
  const now = Date.now();
  if (!force && cachedCategories && now - cachedCategories.timestamp < CACHE_TTL_MS) {
    return cachedCategories.data;
  }
  const data = await getCategories();
  cachedCategories = { data, timestamp: now };
  return data;
}

export async function getCachedProducts(force = false): Promise<Product[]> {
  const now = Date.now();
  if (!force && cachedProducts && now - cachedProducts.timestamp < CACHE_TTL_MS) {
    return cachedProducts.data;
  }
  const data = await getProducts();
  cachedProducts = { data, timestamp: now };
  return data;
}

export async function getCachedSimpleClients(force = false): Promise<SimpleClient[]> {
  const now = Date.now();
  if (!force && cachedClients && now - cachedClients.timestamp < CACHE_TTL_MS) {
    return cachedClients.data;
  }
  const data = await getSimpleClients();
  cachedClients = { data, timestamp: now };
  return data;
}

export function invalidateClientCache(keys?: ('accounts' | 'cards' | 'categories' | 'products' | 'clients')[]) {
  if (!keys) {
    cachedAccounts = null;
    cachedCards = null;
    cachedCategories = null;
    cachedProducts = null;
    cachedClients = null;
    return;
  }

  if (keys.includes('accounts')) cachedAccounts = null;
  if (keys.includes('cards')) cachedCards = null;
  if (keys.includes('categories')) cachedCategories = null;
  if (keys.includes('products')) cachedProducts = null;
  if (keys.includes('clients')) cachedClients = null;
}

