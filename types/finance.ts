export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  created_at: string;
  user_id?: string;
}
