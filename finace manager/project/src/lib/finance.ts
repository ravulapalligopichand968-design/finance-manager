import type { FinanceType, FinanceAccount, Installment } from '@/types';
import { addInterval } from './utils';

export interface FinanceCalcInput {
  finance_type: FinanceType;
  amount_taken: number;
  interest_rate: number;
  interest_amount: number;
  num_installments: number;
  start_date: string;
  first_due_date: string;
}

export interface FinanceCalcResult {
  total_amount: number;
  interest_amount: number;
  installment_amount: number;
  final_due_date: string;
}

export function calculateFinance(input: FinanceCalcInput): FinanceCalcResult {
  let interestAmount = input.interest_amount;

  if (input.interest_rate > 0 && interestAmount === 0) {
    interestAmount = (input.amount_taken * input.interest_rate) / 100;
  }

  const totalAmount = input.amount_taken + interestAmount;
  const installmentAmount = totalAmount / input.num_installments;

  const startDate = new Date(input.first_due_date);
  const finalDueDate = addInterval(startDate, input.finance_type, input.num_installments - 1);

  return {
    total_amount: Math.round(totalAmount * 100) / 100,
    interest_amount: Math.round(interestAmount * 100) / 100,
    installment_amount: Math.round(installmentAmount * 100) / 100,
    final_due_date: finalDueDate.toISOString().split('T')[0],
  };
}

export interface InstallmentScheduleItem {
  installment_no: number;
  due_date: string;
  expected_amount: number;
  amount_paid: number;
  balance: number;
  status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
}

export function generateInstallmentSchedule(
  account: Pick<
    FinanceAccount,
    'finance_type' | 'num_installments' | 'installment_amount' | 'first_due_date' | 'total_amount' | 'amount_paid'
  >
): InstallmentScheduleItem[] {
  const schedule: InstallmentScheduleItem[] = [];
  const startDate = new Date(account.first_due_date);
  let remainingPaid = account.amount_paid;
  const today = new Date(new Date().toDateString());

  for (let i = 0; i < account.num_installments; i++) {
    const dueDate = addInterval(startDate, account.finance_type, i);
    const dueStr = dueDate.toISOString().split('T')[0];

    let paidThis = 0;
    if (remainingPaid > 0) {
      paidThis = Math.min(remainingPaid, account.installment_amount);
      remainingPaid -= paidThis;
    }

    const balance = account.installment_amount - paidThis;
    let status: 'paid' | 'partially_paid' | 'pending' | 'overdue' = 'pending';
    if (paidThis >= account.installment_amount) {
      status = 'paid';
    } else if (paidThis > 0) {
      status = 'partially_paid';
    } else if (dueDate < today) {
      status = 'overdue';
    }

    schedule.push({
      installment_no: i + 1,
      due_date: dueStr,
      expected_amount: account.installment_amount,
      amount_paid: Math.round(paidThis * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      status,
    });
  }

  return schedule;
}

export function determineAccountStatus(
  account: Pick<FinanceAccount, 'amount_paid' | 'total_amount' | 'final_due_date'>
): 'active' | 'completed' | 'overdue' {
  if (account.amount_paid >= account.total_amount) {
    return 'completed';
  }
  if (account.final_due_date) {
    const finalDate = new Date(account.final_due_date);
    const today = new Date(new Date().toDateString());
    if (today > finalDate) {
      return 'overdue';
    }
  }
  return 'active';
}

export function getNextDueDate(
  installments: Installment[],
  account: Pick<FinanceAccount, 'amount_paid' | 'total_amount'>
): string | null {
  if (account.amount_paid >= account.total_amount) return null;

  const today = new Date(new Date().toDateString());
  const upcoming = installments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (upcoming.length === 0) return null;
  return upcoming[0].due_date;
}

export function recalcNextDueFromSchedule(
  account: Pick<FinanceAccount, 'first_due_date' | 'finance_type' | 'num_installments' | 'installment_amount' | 'amount_paid' | 'total_amount' | 'final_due_date'>
): { next_due_date: string | null; next_payment_amount: number; status: 'active' | 'completed' | 'overdue' } {
  const schedule = generateInstallmentSchedule(account);
  const today = new Date(new Date().toDateString());

  if (account.amount_paid >= account.total_amount) {
    return { next_due_date: null, next_payment_amount: 0, status: 'completed' };
  }

  const upcoming = schedule
    .filter((s) => s.status !== 'paid')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  let isOverdue = false;
  if (account.final_due_date) {
    if (today > new Date(account.final_due_date)) isOverdue = true;
  }

  const nextItem = upcoming[0];
  if (nextItem) {
    return {
      next_due_date: nextItem.due_date,
      next_payment_amount: nextItem.balance > 0 ? nextItem.balance : account.installment_amount,
      status: isOverdue ? 'overdue' : 'active',
    };
  }

  return {
    next_due_date: null,
    next_payment_amount: 0,
    status: isOverdue ? 'overdue' : 'active',
  };
}
