/*
# Finance Customer Management System - Database Schema

## Overview
Creates the complete schema for a Finance Customer Management System with admin authentication.
This system tracks customers, their finance accounts (daily/weekly/monthly), payments, and installment schedules.

## Tables Created

### 1. customers
Stores customer personal and contact details.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to authenticated admin)
- name, customer_code, mobile, alternate_mobile, address, occupation, notes
- created_at

### 2. finance_accounts
Stores individual finance accounts for customers.
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- customer_id (uuid, FK to customers, ON DELETE CASCADE)
- finance_type (daily/weekly/monthly)
- amount_taken, interest_rate, interest_amount, total_amount
- installment_amount, num_installments
- amount_paid, remaining_amount
- start_date, first_due_date, final_due_date, next_due_date
- status (active/completed/overdue)
- notes
- created_at

### 3. payments
Records each payment made against a finance account.
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- finance_account_id (uuid, FK to finance_accounts, ON DELETE CASCADE)
- customer_id (uuid, FK to customers)
- payment_date, amount_paid, payment_mode, transaction_reference
- remaining_balance_after, notes
- created_at

### 4. installments
Auto-generated installment schedule for each finance account.
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- finance_account_id (uuid, FK to finance_accounts, ON DELETE CASCADE)
- installment_no, due_date, expected_amount
- amount_paid, balance, status (paid/partially_paid/pending/overdue)
- created_at

## Security
- RLS enabled on all tables
- All tables scoped to authenticated users via user_id ownership checks
- user_id defaults to auth.uid() so inserts work without explicitly passing it
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE)

## Important Notes
1. All monetary amounts use numeric(14,2) for precision
2. Cascade deletes ensure child records are removed when parent is deleted
3. Indexes on frequently queried columns for performance
*/

-- ============ CUSTOMERS TABLE ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  customer_code text NOT NULL,
  mobile text NOT NULL,
  alternate_mobile text,
  address text,
  occupation text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ FINANCE_ACCOUNTS TABLE ============
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  finance_type text NOT NULL CHECK (finance_type IN ('daily', 'weekly', 'monthly')),
  amount_taken numeric(14,2) NOT NULL DEFAULT 0,
  interest_rate numeric(8,2),
  interest_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  installment_amount numeric(14,2) NOT NULL DEFAULT 0,
  num_installments integer NOT NULL DEFAULT 1,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(14,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  first_due_date date NOT NULL,
  final_due_date date,
  next_due_date date,
  next_payment_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_accounts_user_id ON finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_customer_id ON finance_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_status ON finance_accounts(status);

DROP POLICY IF EXISTS "select_own_finance_accounts" ON finance_accounts;
CREATE POLICY "select_own_finance_accounts" ON finance_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_finance_accounts" ON finance_accounts;
CREATE POLICY "insert_own_finance_accounts" ON finance_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_finance_accounts" ON finance_accounts;
CREATE POLICY "update_own_finance_accounts" ON finance_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_finance_accounts" ON finance_accounts;
CREATE POLICY "delete_own_finance_accounts" ON finance_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ PAYMENTS TABLE ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  finance_account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  payment_mode text NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'other')),
  transaction_reference text,
  remaining_balance_after numeric(14,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_finance_account_id ON payments(finance_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INSTALLMENTS TABLE ============
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  finance_account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  installment_no integer NOT NULL,
  due_date date NOT NULL,
  expected_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'partially_paid', 'pending', 'overdue')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_finance_account_id ON installments(finance_account_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);

DROP POLICY IF EXISTS "select_own_installments" ON installments;
CREATE POLICY "select_own_installments" ON installMENTS FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_installments" ON installments;
CREATE POLICY "insert_own_installments" ON installMENTS FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_installments" ON installments;
CREATE POLICY "update_own_installments" ON installMENTS FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_installments" ON installments;
CREATE POLICY "delete_own_installments" ON installMENTS FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
