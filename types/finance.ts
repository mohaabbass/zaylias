export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  account_id?: string | null;
  created_at: string;
  user_id?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string | null;
  balance: number | string;
  is_favorite: boolean;
  created_at: string;
}
