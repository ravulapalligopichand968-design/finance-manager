import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FinanceAccount, Payment, Customer } from '@/types';
import {
  Users, TrendingUp, Wallet, IndianRupee, AlertCircle,
  CalendarClock, ArrowUpCircle, DollarSign
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  totalActiveFinances: number;
  totalAmountGiven: number;
  totalAmountCollected: number;
  totalOutstanding: number;
  todaysCollection: number;
  upcomingPayments: { name: string; amount: number; dueDate: string }[];
  overduePayments: { name: string; amount: number; dueDate: string }[];
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const [customersRes, financeRes, paymentsRes] = await Promise.all([
      supabase.from('customers').select('id, name'),
      supabase.from('finance_accounts').select('*'),
      supabase.from('payments').select('payment_date, amount_paid'),
    ]);

    const customers = customersRes.data as Customer[] | [];
    const finances = (financeRes.data as FinanceAccount[]) || [];
    const payments = (paymentsRes.data as Payment[]) || [];

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const totalAmountGiven = finances.reduce((s, f) => s + Number(f.amount_taken), 0);
    const totalAmountCollected = finances.reduce((s, f) => s + Number(f.amount_paid), 0);
    const totalOutstanding = finances.reduce((s, f) => s + Number(f.remaining_amount), 0);
    const totalActiveFinances = finances.filter((f) => f.status === 'active').length;

    const today = new Date().toDateString();
    const todaysCollection = payments
      .filter((p) => new Date(p.payment_date).toDateString() === today)
      .reduce((s, p) => s + Number(p.amount_paid), 0);

    const upcomingPayments: { name: string; amount: number; dueDate: string }[] = [];
    const overduePayments: { name: string; amount: number; dueDate: string }[] = [];
    const todayDate = new Date(new Date().toDateString());

    finances.forEach((f) => {
      if (f.status === 'completed') return;
      if (!f.next_due_date) return;
      const name = customerMap.get(f.customer_id) || 'Unknown';
      const dueDate = new Date(f.next_due_date);
      const entry = { name, amount: Number(f.next_payment_amount), dueDate: f.next_due_date };

      if (dueDate < todayDate) {
        overduePayments.push(entry);
      } else {
        upcomingPayments.push(entry);
      }
    });

    upcomingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    overduePayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    setStats({
      totalCustomers: customers.length,
      totalActiveFinances,
      totalAmountGiven,
      totalAmountCollected,
      totalOutstanding,
      todaysCollection,
      upcomingPayments: upcomingPayments.slice(0, 8),
      overduePayments: overduePayments.slice(0, 8),
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Customers', value: stats!.totalCustomers.toString(), icon: Users, color: 'blue' },
    { label: 'Active Finances', value: stats!.totalActiveFinances.toString(), icon: TrendingUp, color: 'emerald' },
    { label: 'Total Amount Given', value: formatCurrency(stats!.totalAmountGiven), icon: Wallet, color: 'indigo' },
    { label: 'Total Collected', value: formatCurrency(stats!.totalAmountCollected), icon: IndianRupee, color: 'emerald' },
    { label: 'Total Outstanding', value: formatCurrency(stats!.totalOutstanding), icon: AlertCircle, color: 'red' },
    { label: "Today's Collection", value: formatCurrency(stats!.todaysCollection), icon: ArrowUpCircle, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of your finance business</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorMap[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming & Overdue */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming Payments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Upcoming Payments</h3>
            <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              {stats!.upcomingPayments.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {stats!.upcomingPayments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No upcoming payments</p>
            ) : (
              stats!.upcomingPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">Due: {formatDate(p.dueDate)}</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(p.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-slate-900">Overdue Payments</h3>
            <span className="ml-auto text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
              {stats!.overduePayments.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {stats!.overduePayments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No overdue payments</p>
            ) : (
              stats!.overduePayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-red-400">Was due: {formatDate(p.dueDate)}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(p.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('customers')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all customers →
        </button>
      </div>
    </div>
  );
}
