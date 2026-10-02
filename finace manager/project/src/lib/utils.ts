import type { FinanceType } from '@/types';

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `₹${formatted}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function daysBetween(d1: Date, d2: Date): number {
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function addInterval(date: Date, type: FinanceType, count: number): Date {
  const result = new Date(date);
  if (type === 'daily') {
    result.setDate(result.getDate() + count);
  } else if (type === 'weekly') {
    result.setDate(result.getDate() + count * 7);
  } else {
    result.setMonth(result.getMonth() + count);
  }
  return result;
}

export function getInstallmentLabel(type: FinanceType): string {
  if (type === 'daily') return 'Daily Payment';
  if (type === 'weekly') return 'Weekly Payment';
  return 'Monthly Payment';
}

export function getFinanceTypeLabel(type: FinanceType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getFinanceTypeColor(type: FinanceType): string {
  if (type === 'daily') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (type === 'weekly') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
}

export function getStatusColor(status: string): string {
  if (status === 'active') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (status === 'completed') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (status === 'overdue') return 'text-red-600 bg-red-50 border-red-200';
  if (status === 'paid') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (status === 'partially_paid') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (status === 'pending') return 'text-gray-600 bg-gray-50 border-gray-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getStatusLabel(status: string): string {
  return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function getPaymentModeLabel(mode: string): string {
  if (mode === 'upi') return 'UPI';
  if (mode === 'bank_transfer') return 'Bank Transfer';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function calculateDueDate(startDate: Date, type: FinanceType, installmentNo: number): Date {
  return addInterval(startDate, type, installmentNo);
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
