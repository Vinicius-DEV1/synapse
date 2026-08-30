export type TransactionType = 'income' | 'expense' | 'loan_made' | 'loan_taken' | 'transfer';

export interface Account {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  initial_balance: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  due_date?: string | null;
  status: string;
  is_paid?: number;
  paid_amount?: number;
  account_id?: string | null;
  destination_account_id?: string | null;
  linked_loan_id?: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  expected_date: string | null;
  description: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

