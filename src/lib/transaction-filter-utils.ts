import { Transaction } from '@/types/database';
import { isBusinessTransaction } from './business-scope-utils';
import { formatDate } from './utils';

export type TransactionFilterType =
  | 'all'
  | 'business'
  | 'personal'
  | 'expense'
  | 'income'
  | 'credit'
  | 'pending';

export interface TransactionFilterCriteria {
  filter: TransactionFilterType;
  searchTerm: string;
  selectedCategoryId: string;
  selectedSourceId: string;
}

export interface TransactionDayGroup {
  date: string;
  items: Transaction[];
  incomeTotal: number;
  expenseTotal: number;
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function formatDayGroupLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return formatDate(dateStr);
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const dateObj = new Date(y, m, d);
  const weekday = WEEKDAY_NAMES[dateObj.getDay()] || '';
  return `${formatDate(dateStr)} • ${weekday}`;
}

export function filterTransactionsList(
  transactions: Transaction[],
  criteria: TransactionFilterCriteria
): Transaction[] {
  const { filter, searchTerm, selectedCategoryId, selectedSourceId } = criteria;
  const query = searchTerm.trim().toLowerCase();

  return transactions.filter((t) => {
    if (filter === 'business' && !isBusinessTransaction(t)) return false;
    if (filter === 'personal' && isBusinessTransaction(t)) return false;
    if (
      filter === 'expense' &&
      !(t.type === 'expense' && t.payment_method !== 'credit')
    ) {
      return false;
    }
    if (filter === 'income' && t.type !== 'income') return false;
    if (filter === 'credit' && t.payment_method !== 'credit') return false;
    if (filter === 'pending' && t.is_paid) return false;

    if (selectedCategoryId !== 'all') {
      if (selectedCategoryId === 'none') {
        if (t.category_id) return false;
      } else if (t.category_id !== selectedCategoryId) {
        return false;
      }
    }

    if (selectedSourceId !== 'all') {
      if (selectedSourceId.startsWith('acc:')) {
        const accId = selectedSourceId.replace('acc:', '');
        if (t.account_id !== accId) return false;
      } else if (selectedSourceId.startsWith('card:')) {
        const cardId = selectedSourceId.replace('card:', '');
        if (t.credit_card_id !== cardId) return false;
      }
    }

    if (query) {
      const descMatch = t.description.toLowerCase().includes(query);
      const catMatch = (t.category?.name || '').toLowerCase().includes(query);
      const notesMatch = (t.notes || '').toLowerCase().includes(query);
      if (!descMatch && !catMatch && !notesMatch) return false;
    }

    return true;
  });
}

export function groupTransactionsByDay(
  transactions: Transaction[]
): TransactionDayGroup[] {
  const map = new Map<string, TransactionDayGroup>();

  for (const t of transactions) {
    const d = t.due_date;
    const existing = map.get(d) || {
      date: d,
      items: [],
      incomeTotal: 0,
      expenseTotal: 0,
    };
    existing.items.push(t);
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      existing.incomeTotal += amt;
    } else {
      existing.expenseTotal += amt;
    }
    map.set(d, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

