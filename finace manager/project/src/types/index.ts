export type FinanceType = 'daily' | 'weekly' | 'monthly';
export type FinanceStatus = 'active' | 'completed' | 'overdue';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'other';
export type InstallmentStatus = 'paid' | 'partially_paid' | 'pending' | 'overdue';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  customer_code: string;
  mobile: string;
  alternate_mobile: string | null;
  address: string | null;
  occupation: string | null;
  notes: string | null;
  created_at: string;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  customer_id: string;
  finance_type: FinanceType;
  amount_taken: number;
  interest_rate: number | null;
  interest_amount: number;
  total_amount: number;
  installment_amount: number;
  num_installments: number;
  amount_paid: number;
  remaining_amount: number;
  start_date: string;
  first_due_date: string;
  final_due_date: string | null;
  next_due_date: string | null;
  next_payment_amount: number;
  status: FinanceStatus;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  finance_account_id: string;
  customer_id: string;
  payment_date: string;
  amount_paid: number;
  payment_mode: PaymentMode;
  transaction_reference: string | null;
  remaining_balance_after: number | null;
  notes: string | null;
  created_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  finance_account_id: string;
  installment_no: number;
  due_date: string;
  expected_amount: number;
  amount_paid: number;
  balance: number;
  status: InstallmentStatus;
  created_at: string;
}

export interface FinanceAccountWithDetails extends FinanceAccount {
  customer?: Customer;
}

export interface CustomerWithFinances extends Customer {
  finance_accounts?: FinanceAccount[];
}
