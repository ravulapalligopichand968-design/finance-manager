import { useState, type FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateFinance, generateInstallmentSchedule, recalcNextDueFromSchedule } from '@/lib/finance';
import { formatCurrency } from '@/lib/utils';
import type { FinanceType, Customer, FinanceAccount } from '@/types';
import { X, Save, Calculator, Calendar, IndianRupee, Percent, Hash, Repeat } from 'lucide-react';

interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer: Customer;
  editFinance?: FinanceAccount | null;
}

export default function FinanceModal({ open, onClose, onSaved, customer, editFinance }: FinanceModalProps) {
  const [form, setForm] = useState({
    finance_type: 'daily' as FinanceType,
    amount_taken: '',
    interest_rate: '',
    interest_amount: '',
    num_installments: '',
    start_date: new Date().toISOString().split('T')[0],
    first_due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editFinance) {
      setForm({
        finance_type: editFinance.finance_type,
        amount_taken: String(editFinance.amount_taken),
        interest_rate: String(editFinance.interest_rate || ''),
        interest_amount: String(editFinance.interest_amount || ''),
        num_installments: String(editFinance.num_installments),
        start_date: editFinance.start_date,
        first_due_date: editFinance.first_due_date,
        notes: editFinance.notes || '',
      });
    } else {
      setForm({
        finance_type: 'daily',
        amount_taken: '',
        interest_rate: '',
        interest_amount: '',
        num_installments: '',
        start_date: new Date().toISOString().split('T')[0],
        first_due_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setError(null);
  }, [editFinance, open]);

  if (!open) return null;

  const amountTaken = parseFloat(form.amount_taken) || 0;
  const interestRate = parseFloat(form.interest_rate) || 0;
  const interestAmount = parseFloat(form.interest_amount) || 0;
  const numInstallments = parseInt(form.num_installments) || 1;

  const calc = calculateFinance({
    finance_type: form.finance_type,
    amount_taken: amountTaken,
    interest_rate: interestRate,
    interest_amount: interestAmount,
    num_installments: numInstallments,
    start_date: form.start_date,
    first_due_date: form.first_due_date,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (amountTaken <= 0) {
      setError('Amount taken must be greater than 0');
      setLoading(false);
      return;
    }
    if (numInstallments < 1) {
      setError('Number of installments must be at least 1');
      setLoading(false);
      return;
    }

    const payload = {
      customer_id: customer.id,
      finance_type: form.finance_type,
      amount_taken: amountTaken,
      interest_rate: interestRate || null,
      interest_amount: calc.interest_amount,
      total_amount: calc.total_amount,
      installment_amount: calc.installment_amount,
      num_installments: numInstallments,
      amount_paid: editFinance ? editFinance.amount_paid : 0,
      remaining_amount: editFinance ? editFinance.remaining_amount : calc.total_amount,
      start_date: form.start_date,
      first_due_date: form.first_due_date,
      final_due_date: calc.final_due_date,
      next_due_date: editFinance ? editFinance.next_due_date : form.first_due_date,
      next_payment_amount: editFinance ? editFinance.next_payment_amount : calc.installment_amount,
      status: editFinance ? editFinance.status : 'active' as const,
      notes: form.notes || null,
    };

    let accountId = editFinance?.id;

    if (editFinance) {
      const { error: updateError } = await supabase.from('finance_accounts').update(payload).eq('id', editFinance.id);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      // Delete old installments and regenerate
      await supabase.from('installments').delete().eq('finance_account_id', editFinance.id);
    } else {
      const { data, error: insertError } = await supabase.from('finance_accounts').insert(payload).select().single();
      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
      accountId = data.id;
    }

    // Generate installment schedule
    const schedule = generateInstallmentSchedule({
      finance_type: form.finance_type,
      num_installments: numInstallments,
      installment_amount: calc.installment_amount,
      first_due_date: form.first_due_date,
      total_amount: calc.total_amount,
      amount_paid: editFinance ? editFinance.amount_paid : 0,
    });

    const installmentPayload = schedule.map((s) => ({
      finance_account_id: accountId,
      installment_no: s.installment_no,
      due_date: s.due_date,
      expected_amount: s.expected_amount,
      amount_paid: s.amount_paid,
      balance: s.balance,
      status: s.status,
    }));

    if (installmentPayload.length > 0) {
      const { error: instError } = await supabase.from('installments').insert(installmentPayload);
      if (instError) {
        setError('Finance saved but installment schedule failed: ' + instError.message);
        setLoading(false);
        return;
      }
    }

    // Recalc next due date and status
    const recalc = recalcNextDueFromSchedule({
      first_due_date: form.first_due_date,
      finance_type: form.finance_type,
      num_installments: numInstallments,
      installment_amount: calc.installment_amount,
      amount_paid: editFinance ? editFinance.amount_paid : 0,
      total_amount: calc.total_amount,
      final_due_date: calc.final_due_date,
    });

    await supabase
      .from('finance_accounts')
      .update({
        next_due_date: recalc.next_due_date,
        next_payment_amount: recalc.next_payment_amount,
        status: recalc.status,
      })
      .eq('id', accountId);

    setLoading(false);
    onSaved();
    onClose();
  };

  const financeTypes: { value: FinanceType; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editFinance ? 'Edit Finance' : 'Add Finance Account'}
            </h2>
            <p className="text-xs text-slate-500">{customer.name} • {customer.customer_code}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Finance Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Finance Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {financeTypes.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setForm({ ...form, finance_type: ft.value })}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.finance_type === ft.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Taken *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  required
                  step="0.01"
                  value={form.amount_taken}
                  onChange={(e) => setForm({ ...form, amount_taken: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="20000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interest Rate (%)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value, interest_amount: '' })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interest Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.interest_amount}
                onChange={(e) => setForm({ ...form, interest_amount: e.target.value, interest_rate: '' })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Or enter directly"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Installments *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  required
                  min="1"
                  value={form.num_installments}
                  onChange={(e) => setForm({ ...form, num_installments: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First Due Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={form.first_due_date}
                  onChange={(e) => setForm({ ...form, first_due_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Any notes about this finance"
            />
          </div>

          {/* Auto-calculated Summary */}
          {amountTaken > 0 && numInstallments > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm mb-1">
                <Calculator className="w-4 h-4" />
                Auto-Calculated Values
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" />
                    {form.finance_type === 'daily' ? 'Daily' : form.finance_type === 'weekly' ? 'Weekly' : 'Monthly'} Payment
                  </span>
                  <span className="font-semibold text-slate-900">{formatCurrency(calc.installment_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Interest</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(calc.interest_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Payable</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(calc.total_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Final Due</span>
                  <span className="font-semibold text-slate-900 text-xs">{calc.final_due_date}</span>
                </div>
              </div>
            </div>
          )}

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
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium py-2.5 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : editFinance ? 'Update Finance' : 'Save Finance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
