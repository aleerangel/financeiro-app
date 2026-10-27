export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType = 'checking' | 'wallet' | 'savings' | 'investment';
export type AccountYieldType = 'none' | 'cdi_percent' | 'monthly_percent';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix' | 'transfer';
export type CategoryType = 'income' | 'expense' | 'both';
export type RecurrenceFrequency = 'monthly' | 'yearly';
export type FinancialScope = 'personal' | 'business';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  yield_type?: AccountYieldType;
  yield_rate?: number;
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
  scope?: FinancialScope;
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
  scope?: FinancialScope;
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
  scope?: FinancialScope;
  created_at: string;
  updated_at: string;
  // Campos populados via joins
  category?: Category | null;
  account?: Account | null;
  credit_card?: CreditCard | null;
}

export type ProductType = 'service' | 'product';

export interface ServiceProduct {
  id: string;
  user_id: string;
  service_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product | null;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  type: ProductType;
  default_price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock?: number;
  icon: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  service_products?: ServiceProduct[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost?: number;
  is_service_component?: boolean;
  parent_service_id?: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  last_contacted_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type SalePaymentMethod = PaymentMethod | 'on_credit';
export type SaleStatus = 'paid' | 'pending' | 'partially_paid';

export interface SaleAmortization {
  id: string;
  user_id: string;
  sale_id: string;
  client_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  account_id: string;
  transaction_id?: string | null;
  amortized_at: string;
  notes?: string | null;
  created_at: string;
  account?: Account | null;
  client?: Client | null;
}

export interface Sale {
  id: string;
  user_id: string;
  client_id?: string | null;
  client_name: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  status?: SaleStatus;
  payment_method: SalePaymentMethod;
  due_date?: string | null;
  account_id: string | null;
  transaction_id: string | null;
  sale_date: string;
  notes: string | null;
  created_at: string;
  // Campos populados via joins
  items?: SaleItem[];
  account?: Account | null;
  client?: Client | null;
  amortizations?: SaleAmortization[];
}

export interface SubscriptionPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  price: number;
  interval: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'active' | 'paused' | 'canceled';
export type InvoiceStatus = 'pending' | 'paid' | 'canceled';

export interface ClientSubscription {
  id: string;
  user_id: string;
  client_id: string;
  plan_id?: string | null;
  custom_plan_name?: string | null;
  price: number;
  due_day: number;
  start_date: string;
  status: SubscriptionStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Campos populados via joins
  client?: Client | null;
  plan?: SubscriptionPlan | null;
  latest_invoice?: SubscriptionInvoice | null;
}

export interface SubscriptionInvoice {
  id: string;
  user_id: string;
  subscription_id: string;
  client_id: string;
  amount: number;
  due_date: string;
  period_start: string;
  period_end: string;
  status: InvoiceStatus;
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  account_id?: string | null;
  transaction_id?: string | null;
  created_at: string;
  updated_at: string;
  // Campos populados via joins
  client?: Client | null;
  subscription?: ClientSubscription | null;
  account?: Account | null;
}

export type BusinessSegment =
  | 'barbearia'
  | 'beleza_estetica'
  | 'servicos_manutencao'
  | 'saude_consultorio'
  | 'aulas_treinamento'
  | 'comercio_geral'
  | 'outro';

export interface BusinessProfile {
  user_id: string;
  business_name: string | null;
  cnpj?: string | null;
  segment: BusinessSegment;
  has_business: boolean;
  sales_label: string;
  default_cycle_days: number;
  onboarding_completed: boolean;
  legacy_migrated: boolean;
  created_at: string;
  updated_at: string;
}



