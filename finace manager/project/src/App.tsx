import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import CustomerList from '@/pages/CustomerList';
import CustomerProfile from '@/pages/CustomerProfile';
import CustomerModal from '@/components/CustomerModal';
import type { Customer } from '@/types';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedCustomerId(null);
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
  };

  const handleAddCustomer = () => {
    setEditCustomer(null);
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleBack = () => {
    setSelectedCustomerId(null);
    setRefreshKey((k) => k + 1);
  };

  const handleCustomerSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAddCustomer={handleAddCustomer}
      >
        {selectedCustomerId ? (
          <CustomerProfile
            key={`profile-${selectedCustomerId}-${refreshKey}`}
            customerId={selectedCustomerId}
            onBack={handleBack}
            onEditCustomer={handleEditCustomer}
          />
        ) : currentPage === 'dashboard' ? (
          <Dashboard key={`dashboard-${refreshKey}`} onNavigate={handleNavigate} />
        ) : (
          <CustomerList
            key={`list-${refreshKey}`}
            onSelectCustomer={handleSelectCustomer}
            onAddCustomer={handleAddCustomer}
          />
        )}
      </Layout>

      <CustomerModal
        open={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setEditCustomer(null); }}
        onSaved={handleCustomerSaved}
        editCustomer={editCustomer}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
