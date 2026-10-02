import { useState, type FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { generateInstallmentSchedule, recalcNextDueFromSchedule } from '@/lib/finance';
import type { PaymentMode, Customer, FinanceAccount, Installment } from '@/types';
import { X, Save, IndianRupee, Calendar, FileText, CreditCard } from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer: Customer;
  financeAccount: FinanceAccount;
}

export default function PaymentModal({ open, onClose, onSaved, customer, financeAccount }: PaymentModalProps) {
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_mode: 'cash' as PaymentMode,
    transaction_reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: String(financeAccount.installment_amount),
        payment_mode: 'cash',
        transaction_reference: '',
        notes: '',
      });
      setError(null);
    }
  }, [open, financeAccount.installment_amount]);

  if (!open) return null;

  const remaining = Number(financeAccount.remaining_amount);
  const amountPaid = parseFloat(form.amount_paid) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (amountPaid <= 0) {
      setError('Payment amount must be greater than 0');
      setLoading(false);
      return;
    }

    if (amountPaid > remaining + 0.01) {
      setError(`Payment exceeds remaining balance of ${formatCurrency(remaining)}`);
      setLoading(false);
      return;
    }

    const newAmountPaid = Number(financeAccount.amount_paid) + amountPaid;
    const newRemaining = Number(financeAccount.total_amount) - newAmountPaid;

    // Insert payment record
    const { error: payError } = await supabase.from('payments').insert({
      finance_account_id: financeAccount.id,
      customer_id: customer.id,
      payment_date: form.payment_date,
      amount_paid: amountPaid,
      payment_mode: form.payment_mode,
      transaction_reference: form.transaction_reference || null,
      remaining_balance_after: newRemaining,
      notes: form.notes || null,
    });

    if (payError) {
      setError(payError.message);
      setLoading(false);
      return;
    }

    // Regenerate installment schedule with updated amount_paid
    const schedule = generateInstallmentSchedule({
      finance_type: financeAccount.finance_type,
      num_installments: financeAccount.num_installments,
      installment_amount: financeAccount.installment_amount,
      first_due_date: financeAccount.first_due_date,
      total_amount: financeAccount.total_amount,
      amount_paid: newAmountPaid,
    });

    // Delete old installments and insert new ones
    await supabase.from('installments').delete().eq('finance_account_id', financeAccount.id);

    const installmentPayload = schedule.map((s) => ({
      finance_account_id: financeAccount.id,
      installment_no: s.installment_no,
      due_date: s.due_date,
      expected_amount: s.expected_amount,
      amount_paid: s.amount_paid,
      balance: s.balance,
      status: s.status,
    }));

    if (installmentPayload.length > 0) {
      await supabase.from('installments').insert(installmentPayload);
    }

    // Recalc next due and status
    const recalc = recalcNextDueFromSchedule({
      first_due_date: financeAccount.first_due_date,
      finance_type: financeAccount.finance_type,
      num_installments: financeAccount.num_installments,
      installment_amount: financeAccount.installment_amount,
      amount_paid: newAmountPaid,
      total_amount: financeAccount.total_amount,
      final_due_date: financeAccount.final_due_date,
    });

    // Update finance account
    await supabase
      .from('finance_accounts')
      .update({
        amount_paid: newAmountPaid,
        remaining_amount: newRemaining,
        next_due_date: recalc.next_due_date,
        next_payment_amount: recalc.next_payment_amount,
        status: recalc.status,
      })
      .eq('id', financeAccount.id);

    setLoading(false);
    onSaved();
    onClose();
  };

  const paymentModes: { value: PaymentMode; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
            <p className="text-xs text-slate-500">{customer.name} • {financeAccount.finance_type} Finance</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Balance info */}
          <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
            <span className="text-slate-500">Outstanding Balance</span>
            <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                required
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                required
                step="0.01"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter amount"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode *</label>
            <div className="grid grid-cols-4 gap-2">
              {paymentModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setForm({ ...form, payment_mode: mode.value })}
                  className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                    form.payment_mode === mode.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction Reference</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.transaction_reference}
                onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="UPI ID / Cheque no. (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Any notes"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium py-2.5 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
