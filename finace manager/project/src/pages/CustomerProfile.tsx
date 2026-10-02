import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency, formatDate, getFinanceTypeLabel, getFinanceTypeColor,
  getStatusColor, getStatusLabel, getPaymentModeLabel, getInstallmentLabel,
} from '@/lib/utils';
import type { Customer, FinanceAccount, Payment, Installment } from '@/types';
import {
  ArrowLeft, Phone, MapPin, Briefcase, FileText, PlusCircle,
  Wallet, TrendingUp, IndianRupee, AlertCircle, CreditCard,
  CalendarClock, Plus, Edit3, ChevronDown, ChevronUp, Receipt
} from 'lucide-react';
import FinanceModal from '@/components/FinanceModal';
import PaymentModal from '@/components/PaymentModal';

interface CustomerProfileProps {
  customerId: string;
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export default function CustomerProfile({ customerId, onBack, onEditCustomer }: CustomerProfileProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [finances, setFinances] = useState<FinanceAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<Record<string, Installment[]>>({});
  const [loading, setLoading] = useState(true);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFinance, setSelectedFinance] = useState<FinanceAccount | null>(null);
  const [editFinance, setEditFinance] = useState<FinanceAccount | null>(null);
  const [expandedFinance, setExpandedFinance] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [customerId]);

  const loadProfile = async () => {
    setLoading(true);

    const { data: custData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();
    setCustomer(custData as Customer | null);

    const { data: finData } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });
    const finList = (finData as FinanceAccount[]) || [];
    setFinances(finList);

    if (finList.length > 0) {
      const finIds = finList.map((f) => f.id);

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .in('finance_account_id', finIds)
        .order('payment_date', { ascending: false });
      setPayments((payData as Payment[]) || []);

      const { data: instData } = await supabase
        .from('installments')
        .select('*')
        .in('finance_account_id', finIds)
        .order('installment_no', { ascending: true });

      const instMap: Record<string, Installment[]> = {};
      (instData as Installment[] || []).forEach((inst) => {
        if (!instMap[inst.finance_account_id]) instMap[inst.finance_account_id] = [];
        instMap[inst.finance_account_id].push(inst);
      });
      setInstallments(instMap);
    } else {
      setPayments([]);
      setInstallments({});
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Customer not found</p>
        <button onClick={onBack} className="mt-4 text-sm text-blue-600 font-medium">← Back to customers</button>
      </div>
    );
  }

  const totalTaken = finances.reduce((s, f) => s + Number(f.amount_taken), 0);
  const totalInterest = finances.reduce((s, f) => s + Number(f.interest_amount), 0);
  const totalPayable = finances.reduce((s, f) => s + Number(f.total_amount), 0);
  const totalPaid = finances.reduce((s, f) => s + Number(f.amount_paid), 0);
  const totalOutstanding = finances.reduce((s, f) => s + Number(f.remaining_amount), 0);

  const summaryCards = [
    { label: 'Total Taken', value: formatCurrency(totalTaken), icon: Wallet, color: 'blue' },
    { label: 'Total Interest', value: formatCurrency(totalInterest), icon: TrendingUp, color: 'amber' },
    { label: 'Total Payable', value: formatCurrency(totalPayable), icon: IndianRupee, color: 'indigo' },
    { label: 'Total Paid', value: formatCurrency(totalPaid), icon: CreditCard, color: 'emerald' },
    { label: 'Outstanding', value: formatCurrency(totalOutstanding), icon: AlertCircle, color: 'red' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  const paymentsForFinance = (finId: string) => payments.filter((p) => p.finance_account_id === finId);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Customer Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
              <p className="text-sm text-slate-500">{customer.customer_code}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.mobile}
                </span>
                {customer.alternate_mobile && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customer.alternate_mobile}
                  </span>
                )}
                {customer.occupation && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {customer.occupation}
                  </span>
                )}
              </div>
              {customer.address && (
                <p className="flex items-center gap-1.5 mt-1 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {customer.address}
                </p>
              )}
              {customer.notes && (
                <p className="flex items-start gap-1.5 mt-1 text-sm text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  {customer.notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEditCustomer(customer)}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => { setEditFinance(null); setShowFinanceModal(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Finance
            </button>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      {finances.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Finance Summary</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorMap[card.color]} mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{card.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finance Accounts */}
      {finances.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No finance accounts yet</p>
          <button
            onClick={() => { setEditFinance(null); setShowFinanceModal(true); }}
            className="mt-4 flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add First Finance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Finance Accounts ({finances.length})</h3>
          {finances.map((finance) => {
            const finPayments = paymentsForFinance(finance.id);
            const finInstallments = installments[finance.id] || [];
            const isExpanded = expandedFinance === finance.id;
            const installmentsPaid = finInstallments.filter((i) => i.status === 'paid').length;
            const installmentsRemaining = finance.num_installments - installmentsPaid;

            return (
              <div key={finance.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Finance Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFinanceTypeColor(finance.finance_type)}`}>
                        {getFinanceTypeLabel(finance.finance_type)} Finance
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(finance.status)}`}>
                        {getStatusLabel(finance.status)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditFinance(finance); setShowFinanceModal(true); }}
                        className="flex items-center gap-1.5 border border-slate-300 text-slate-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {finance.status !== 'completed' && (
                        <button
                          onClick={() => { setSelectedFinance(finance); setShowPaymentModal(true); }}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Finance Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    <FinanceField label="Amount Taken" value={formatCurrency(Number(finance.amount_taken))} />
                    <FinanceField label="Interest" value={formatCurrency(Number(finance.interest_amount))} />
                    <FinanceField label="Total To Pay" value={formatCurrency(Number(finance.total_amount))} />
                    <FinanceField label={getInstallmentLabel(finance.finance_type)} value={formatCurrency(Number(finance.installment_amount))} />
                    <FinanceField label="Amount Paid" value={formatCurrency(Number(finance.amount_paid))} />
                    <FinanceField label="Remaining" value={formatCurrency(Number(finance.remaining_amount))} />
                    <FinanceField label="Next Payment" value={formatCurrency(Number(finance.next_payment_amount))} />
                    <FinanceField label="Next Due Date" value={formatDate(finance.next_due_date)} />
                    <FinanceField label="Start Date" value={formatDate(finance.start_date)} />
                    <FinanceField label="First Due" value={formatDate(finance.first_due_date)} />
                    <FinanceField label="Final Due" value={formatDate(finance.final_due_date)} />
                    <FinanceField label="Installments" value={`${installmentsPaid} / ${finance.num_installments} paid`} />
                  </div>

                  {/* Toggle schedule/payments */}
                  <button
                    onClick={() => setExpandedFinance(isExpanded ? null : finance.id)}
                    className="flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Hide Details' : 'Show Payment History & Installment Schedule'}
                  </button>
                </div>

                {/* Expanded: Payment History & Installment Schedule */}
                {isExpanded && (
                  <div className="p-5 space-y-6 bg-slate-50/50">
                    {/* Payment History */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                        <Receipt className="w-4 h-4 text-slate-500" />
                        Payment History ({finPayments.length})
                      </h4>
                      {finPayments.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center bg-white rounded-lg border border-slate-100">
                          No payments recorded yet
                        </p>
                      ) : (
                        <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                              <tr>
                                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                                <th className="text-left px-4 py-2.5 font-medium">Mode</th>
                                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Reference</th>
                                <th className="text-right px-4 py-2.5 font-medium">Balance After</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {finPayments.map((pay) => (
                                <tr key={pay.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5 text-slate-700">{formatDate(pay.payment_date)}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                                    {formatCurrency(Number(pay.amount_paid))}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    <span className="text-xs">{getPaymentModeLabel(pay.payment_mode)}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell text-xs">
                                    {pay.transaction_reference || '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-slate-700">
                                    {pay.remaining_balance_after !== null ? formatCurrency(Number(pay.remaining_balance_after)) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Installment Schedule */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                        <CalendarClock className="w-4 h-4 text-slate-500" />
                        Installment Schedule ({finance.num_installments} installments)
                      </h4>
                      <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                              <th className="text-left px-4 py-2.5 font-medium">No.</th>
                              <th className="text-left px-4 py-2.5 font-medium">Due Date</th>
                              <th className="text-right px-4 py-2.5 font-medium">Expected</th>
                              <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                              <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Balance</th>
                              <th className="text-center px-4 py-2.5 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {finInstallments.map((inst) => (
                              <tr key={inst.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 text-slate-700 font-medium">{inst.installment_no}</td>
                                <td className="px-4 py-2.5 text-slate-700">{formatDate(inst.due_date)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(Number(inst.expected_amount))}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(Number(inst.amount_paid))}</td>
                                <td className="px-4 py-2.5 text-right text-slate-700 hidden sm:table-cell">{formatCurrency(Number(inst.balance))}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(inst.status)}`}>
                                    {getStatusLabel(inst.status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Finance Modal */}
      {showFinanceModal && customer && (
        <FinanceModal
          open={showFinanceModal}
          onClose={() => { setShowFinanceModal(false); setEditFinance(null); }}
          onSaved={loadProfile}
          customer={customer}
          editFinance={editFinance}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && customer && selectedFinance && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setSelectedFinance(null); }}
          onSaved={loadProfile}
          customer={customer}
          financeAccount={selectedFinance}
        />
      )}
    </div>
  );
}

function FinanceField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}


