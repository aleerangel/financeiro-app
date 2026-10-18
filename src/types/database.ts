export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType = 'checking' | 'wallet' | 'savings' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix' | 'transfer';
export type CategoryType = 'income' | 'expense' | 'both';
export type RecurrenceFrequency = 'monthly' | 'yearly';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Recurrence {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  due_day: number;
  frequency: RecurrenceFrequency;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Campos populados via joins
  category?: Category | null;
  account?: Account | null;
  credit_card?: CreditCard | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  payment_method: PaymentMethod;
  transaction_date: string;
  due_date: string;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  recurrence_id: string | null;
  installment_group_id: string | null;
  current_installment: number | null;
  total_installments: number | null;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Campos populados via joins
  category?: Category | null;
  account?: Account | null;
  credit_card?: CreditCard | null;
}

export type ProductType = 'service' | 'product';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  type: ProductType;
  default_price: number;
  icon: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  client_name: string;
  total_amount: number;
  payment_method: PaymentMethod;
  account_id: string | null;
  transaction_id: string | null;
  sale_date: string;
  notes: string | null;
  created_at: string;
  // Campos populados via joins
  items?: SaleItem[];
  account?: Account | null;
}

