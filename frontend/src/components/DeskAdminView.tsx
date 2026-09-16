import React, { useState } from 'react';
import { Reservation, LoanTransaction, LedgerTransaction, ReservationStatus } from '../types';
import { ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle, Trash2, FileText, DollarSign, Clock } from 'lucide-react';

interface DeskAdminViewProps {
  reservations: Reservation[];
  loans: LoanTransaction[];
  ledger: LedgerTransaction[];
  onCheckout: (reservationId: string, notes?: string) => Promise<void>;
  onReturn: (loanId: string, notes?: string, returnTime?: string) => Promise<void>;
  onCleanupNoShows: () => Promise<void>;
}

export const DeskAdminView: React.FC<DeskAdminViewProps> = ({
  reservations,
  loans,
  ledger,
  onCheckout,
  onReturn,
  onCleanupNoShows,
}) => {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState('');

  const [selectedLoan, setSelectedLoan] = useState<LoanTransaction | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [customReturnTime, setCustomReturnTime] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'reservations' | 'loans' | 'ledger'>('reservations');

  const pendingReservations = reservations.filter((r) => r.status === ReservationStatus.PENDING);
  const activeLoans = loans.filter((l) => l.actualReturnTime === null);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservationId) return;

    setIsProcessing(true);
    try {
      await onCheckout(selectedReservationId, checkoutNotes);
      setSelectedReservationId(null);
      setCheckoutNotes('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setIsProcessing(true);
    try {
      await onReturn(selectedLoan.id, returnNotes, customReturnTime || undefined);
      setSelectedLoan(null);
      setReturnNotes('');
      setCustomReturnTime('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Banner & Cleanup Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-sky-400" />
            <span>AV Desk Checkout & Financial Ledger Admin</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Perform physical gear check-outs, process returns with inspection notes, and trigger automated no-show cleanups.
          </p>
        </div>

        <button
          onClick={onCleanupNoShows}
          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-2 badge-glow-rose shrink-0"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Run No-Show Cleanup (&gt;45m)</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'reservations'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Pending Pickups</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
            {pendingReservations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('loans')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'loans'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Active Borrowings</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-sky-950 text-sky-400 border border-sky-800/40">
            {activeLoans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ledger'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Financial Ledger Log</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            {ledger.length}
          </span>
        </button>
      </div>

      {/* SubTab 1: Pending Pickups */}
      {activeSubTab === 'reservations' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">Pending Reservations Awaiting Desk Pickup</h3>

          {pendingReservations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No pending reservations for pickup.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {pendingReservations.map((res) => (
                <div key={res.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{res.asset.model}</span>
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-900 text-sky-300 rounded border border-slate-800">
                        {res.asset.barcode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      User: <strong className="text-slate-200">{res.user.name}</strong> ({res.user.email})
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Start: {new Date(res.startTime).toLocaleString()}</span>
                      <span>End: {new Date(res.endTime).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReservationId(res.id)}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Desk Check-Out</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Active Borrowings */}
      {activeSubTab === 'loans' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">Active Checked-Out Equipment</h3>

          {activeLoans.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No gear currently checked out.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {activeLoans.map((loan) => (
                <div key={loan.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{loan.asset.model}</span>
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-900 text-sky-300 rounded border border-slate-800">
                        {loan.asset.barcode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Borrower: <strong className="text-slate-200">{loan.user.name}</strong> | Deposit Held:{' '}
                      <strong className="text-emerald-400">${loan.depositAmount.toFixed(2)}</strong>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Checked Out: {new Date(loan.checkoutTime).toLocaleString()}</span>
                      <span>Expected Due: <strong className="text-amber-300">{new Date(loan.expectedReturnTime).toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLoan(loan)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Process Return & Fee</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Financial Ledger Log */}
      {activeSubTab === 'ledger' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">Ledger Transaction History</h3>

          {ledger.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No ledger transactions recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Transaction Type</th>
                    <th className="pb-3">User & Asset</th>
                    <th className="pb-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {ledger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40">
                      <td className="py-3 text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            tx.type === 'DEPOSIT_HELD'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : tx.type === 'LATE_FEE_DEDUCTED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {tx.loan?.user?.name} — {tx.loan?.asset?.model}
                      </td>
                      <td className="py-3 font-bold text-white">${tx.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Desk Checkout */}
      {selectedReservationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Confirm Desk Check-Out</h3>
            <p className="text-xs text-slate-400">
              Transform reservation into active loan and record DEPOSIT_HELD ledger entry.
            </p>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">Inspection Notes (Checkout)</label>
              <textarea
                rows={3}
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="e.g. Lens verified scratch-free, battery 100% charged..."
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedReservationId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutSubmit}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20"
              >
                {isProcessing ? 'Processing...' : 'Confirm Checkout & Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Return Gear & Fee Breakdown */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              <span>Process Return & Compute Late Fee</span>
            </h3>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div>Borrower: <strong className="text-white">{selectedLoan.user.name}</strong></div>
              <div>Gear: <strong className="text-sky-300">{selectedLoan.asset.model}</strong></div>
              <div>Due Date: <strong className="text-amber-300">{new Date(selectedLoan.expectedReturnTime).toLocaleString()}</strong></div>
              <div>Deposit Held: <strong className="text-emerald-400">${selectedLoan.depositAmount.toFixed(2)}</strong></div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">Return Inspection Notes</label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. Returned clean with all accessories..."
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-1">
                Custom Return Timestamp (Optional - for late fee test validation)
              </label>
              <input
                type="datetime-local"
                value={customReturnTime}
                onChange={(e) => setCustomReturnTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave blank to use current server time. Operational hours are calculated Mon-Fri 8:00 AM - 6:00 PM.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
              >
                {isProcessing ? 'Calculating...' : 'Finalize Return & Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
