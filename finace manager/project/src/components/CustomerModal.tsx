import { useState, type FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types';
import { X, User, Phone, MapPin, Briefcase, FileText, Save } from 'lucide-react';

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editCustomer?: Customer | null;
}

export default function CustomerModal({ open, onClose, onSaved, editCustomer }: CustomerModalProps) {
  const [form, setForm] = useState({
    name: '',
    customer_code: '',
    mobile: '',
    alternate_mobile: '',
    address: '',
    occupation: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editCustomer) {
      setForm({
        name: editCustomer.name,
        customer_code: editCustomer.customer_code,
        mobile: editCustomer.mobile,
        alternate_mobile: editCustomer.alternate_mobile || '',
        address: editCustomer.address || '',
        occupation: editCustomer.occupation || '',
        notes: editCustomer.notes || '',
      });
    } else {
      setForm({
        name: '',
        customer_code: '',
        mobile: '',
        alternate_mobile: '',
        address: '',
        occupation: '',
        notes: '',
      });
    }
    setError(null);
  }, [editCustomer, open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name,
      customer_code: form.customer_code,
      mobile: form.mobile,
      alternate_mobile: form.alternate_mobile || null,
      address: form.address || null,
      occupation: form.occupation || null,
      notes: form.notes || null,
    };

    let result;
    if (editCustomer) {
      result = await supabase.from('customers').update(payload).eq('id', editCustomer.id);
    } else {
      result = await supabase.from('customers').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  const fields = [
    { key: 'name', label: 'Customer Name *', icon: User, type: 'text', placeholder: 'e.g., Ravi' },
    { key: 'customer_code', label: 'Customer ID *', icon: FileText, type: 'text', placeholder: 'e.g., CUST001' },
    { key: 'mobile', label: 'Mobile Number *', icon: Phone, type: 'tel', placeholder: 'e.g., 9876543210' },
    { key: 'alternate_mobile', label: 'Alternate Mobile', icon: Phone, type: 'tel', placeholder: 'Optional' },
    { key: 'occupation', label: 'Occupation', icon: Briefcase, type: 'text', placeholder: 'e.g., Business' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {editCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={f.type}
                      required={f.label.includes('*')}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Customer address"
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
              placeholder="Any additional notes"
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
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium py-2.5 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : editCustomer ? 'Update' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
