import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { EquipmentBrowser } from './components/EquipmentBrowser';
import { BookingPanel } from './components/BookingPanel';
import { DeskAdminView } from './components/DeskAdminView';
import { PhysicalAsset, AssetCategory, User, Reservation, LoanTransaction, LedgerTransaction } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'browser' | 'booking' | 'admin'>('browser');

  const [assets, setAssets] = useState<PhysicalAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loans, setLoans] = useState<LoanTransaction[]>([]);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssetForBooking, setSelectedAssetForBooking] = useState<PhysicalAsset | null>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [assetsRes, catRes, usersRes, resRes, loansRes, ledgerRes] = await Promise.all([
        axios.get('/api/assets'),
        axios.get('/api/categories'),
        axios.get('/api/users'),
        axios.get('/api/reservations'),
        axios.get('/api/loans'),
        axios.get('/api/ledger'),
      ]);

      if (assetsRes.data.success) setAssets(assetsRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (resRes.data.success) setReservations(resRes.data.data);
      if (loansRes.data.success) setLoans(loansRes.data.data);
      if (ledgerRes.data.success) setLedger(ledgerRes.data.data);
    } catch (err) {
      console.error('Error loading AV room data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSelectForBooking = (asset: PhysicalAsset) => {
    setSelectedAssetForBooking(asset);
    setActiveTab('booking');
  };

  const handleBookingSubmit = async (data: {
    userId: string;
    assetId: string;
    startTime: string;
    endTime: string;
  }) => {
    try {
      const response = await axios.post('/api/reservations', data);
      await fetchAllData();
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Booking failed.',
      };
    }
  };

  const handleCheckout = async (reservationId: string, notes?: string) => {
    try {
      await axios.post(`/api/reservations/${reservationId}/checkout`, { inspectionNotes: notes });
      await fetchAllData();
    } catch (err: any) {
      alert(`Checkout failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleReturn = async (loanId: string, notes?: string, returnTime?: string) => {
    try {
      const response = await axios.post(`/api/loans/${loanId}/return`, {
        returnNotes: notes,
        returnTime,
      });
      await fetchAllData();
      const breakdown = response.data.data.lateFeeBreakdown;
      alert(
        `Gear Return Processed!\n` +
        `Operating Hours Late: ${breakdown.operatingHoursLate} hrs\n` +
        `Late Fee Accrued: $${breakdown.finalLateFee.toFixed(2)}\n` +
        `Deposit Refunded: $${response.data.data.depositRefunded.toFixed(2)}`
      );
    } catch (err: any) {
      alert(`Return failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleCleanupNoShows = async () => {
    try {
      const res = await axios.post('/api/cron/cleanup-noshows', {});
      await fetchAllData();
      alert(`No-Show Cleanup Completed!\nCleaned Reservations: ${res.data.data.cleanedCount}`);
    } catch (err: any) {
      alert(`Cleanup failed: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={fetchAllData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browser' && (
          <EquipmentBrowser
            assets={assets}
            categories={categories}
            onSelectForBooking={handleSelectForBooking}
          />
        )}

        {activeTab === 'booking' && (
          <BookingPanel
            users={users}
            assets={assets}
            categories={categories}
            preSelectedAsset={selectedAssetForBooking}
            onSubmitBooking={handleBookingSubmit}
          />
        )}

        {activeTab === 'admin' && (
          <DeskAdminView
            reservations={reservations}
            loans={loans}
            ledger={ledger}
            onCheckout={handleCheckout}
            onReturn={handleReturn}
            onCleanupNoShows={handleCleanupNoShows}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        University AV Room Equipment Lending & Inventory System &bull; Enforces Concurrency Locks, 1-Hr Buffer Windows, and Operating Hours Late Fees
      </footer>
    </div>
  );
}

export default App;
