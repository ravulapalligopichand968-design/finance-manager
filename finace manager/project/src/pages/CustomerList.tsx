import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, FinanceAccount } from '@/types';
import { Search, Users, ChevronRight, Phone, IdCard, PlusCircle } from 'lucide-react';

interface CustomerListProps {
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
}

export default function CustomerList({ onSelectCustomer, onAddCustomer }: CustomerListProps) {
  const [customers, setCustomers] = useState<(Customer & { finance_accounts: FinanceAccount[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, finance_accounts(*)')
      .order('created_at', { ascending: false });

    setCustomers((data as (Customer & { finance_accounts: FinanceAccount[] })[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.customer_code.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500 mt-1">Search and manage your customers</p>
        </div>
        <button
          onClick={onAddCustomer}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm sm:hidden"
        >
          <PlusCircle className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, mobile number, or customer ID..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'No customers found matching your search' : 'No customers yet'}
          </p>
          {!search && (
            <button
              onClick={onAddCustomer}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first customer →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => {
            const totalOutstanding = customer.finance_accounts.reduce(
              (s, f) => s + Number(f.remaining_amount),
              0
            );
            const totalTaken = customer.finance_accounts.reduce(
              (s, f) => s + Number(f.amount_taken),
              0
            );
            return (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </h3>
                      <p className="text-xs text-slate-500">{customer.customer_code}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customer.mobile}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    {customer.finance_accounts.length} finance account(s)
                  </div>
                </div>

                {customer.finance_accounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Total Taken</p>
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(totalTaken)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className={`text-sm font-semibold ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(totalOutstanding)}
                      </p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
