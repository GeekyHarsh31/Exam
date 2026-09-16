import React, { useState, useEffect } from 'react';
import { User, PhysicalAsset, AssetCategory, AccountStatus, AssetStatus } from '../types';
import { Calendar, Clock, AlertOctagon, CheckCircle, ShieldAlert, DollarSign, Layers, Info } from 'lucide-react';

interface BookingPanelProps {
  users: User[];
  assets: PhysicalAsset[];
  categories: AssetCategory[];
  preSelectedAsset?: PhysicalAsset | null;
  onSubmitBooking: (bookingData: {
    userId: string;
    assetId: string;
    startTime: string;
    endTime: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const BookingPanel: React.FC<BookingPanelProps> = ({
  users,
  assets,
  categories,
  preSelectedAsset,
  onSubmitBooking,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');

  // Default times: tomorrow 09:00 to 17:00
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(9, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000); // 17:00

  const [startTime, setStartTime] = useState<string>(
    tomorrow.toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState<string>(
    tomorrowEnd.toISOString().slice(0, 16)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (preSelectedAsset) {
      setSelectedAssetId(preSelectedAsset.id);
    } else if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [preSelectedAsset, assets]);

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      // Default to an active student if available
      const activeUser = users.find((u) => u.status === AccountStatus.ACTIVE) || users[0];
      setSelectedUserId(activeUser.id);
    }
  }, [users]);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const targetCategory = selectedAsset ? categories.find((c) => c.id === selectedAsset.categoryId) : null;

  // Calculate user's active borrowings in target category
  const activeUserBorrowings = React.useMemo(() => {
    if (!selectedUser || !selectedAsset) return 0;

    const pendingCount = (selectedUser.reservations || []).filter(
      (r) =>
        ['PENDING', 'ACTIVE'].includes(r.status) &&
        r.asset?.categoryId === selectedAsset.categoryId
    ).length;

    const activeLoanCount = (selectedUser.loans || []).filter(
      (l) => l.actualReturnTime === null && l.asset?.categoryId === selectedAsset.categoryId
    ).length;

    return pendingCount + activeLoanCount;
  }, [selectedUser, selectedAsset]);

  const limitReached = targetCategory ? activeUserBorrowings >= targetCategory.maxBorrowLimit : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedUserId || !selectedAssetId || !startTime || !endTime) {
      setFeedback({ type: 'error', message: 'Please complete all required form fields.' });
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setFeedback({ type: 'error', message: 'Return End Time must be after Start Time.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitBooking({
        userId: selectedUserId,
        assetId: selectedAssetId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Reservation created successfully! 1-hour maintenance buffer inserted before and after slot.',
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to create reservation.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error processing request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-7 h-7 text-sky-400" />
          <span>AV Room Equipment Reservation Desk</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Enforces 1-Hour Buffer Windows, Category Borrow Limits, Account Standing, and Operating Hours Fee Rules.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Form (2 Cols) */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-6 border border-slate-800">
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-start space-x-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>{feedback.message}</div>
            </div>
          )}

          {/* Select User */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              1. Select Borrowing User Account
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) — {u.email} [{u.status}]
                </option>
              ))}
            </select>
            {selectedUser?.status === AccountStatus.BLOCKED && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                This user account is BLOCKED. Reservation attempt will be rejected.
              </p>
            )}
          </div>

          {/* Select Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              2. Select Physical Asset (Unique Unit)
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 text-sm font-mono"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.category.name}] {a.model} — Barcode: {a.barcode} ({a.status})
                </option>
              ))}
            </select>
          </div>

          {/* Date / Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Pickup Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Expected Return Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Buffer Window Notice */}
          <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 text-xs space-y-1 text-sky-200">
            <div className="font-semibold flex items-center gap-1.5 text-sky-300">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Automatic 1-Hour Buffer Windows Enforced</span>
            </div>
            <p className="text-slate-300">
              The system will block inventory from{' '}
              <strong className="text-white">
                {startTime ? new Date(new Date(startTime).getTime() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </strong>{' '}
              to{' '}
              <strong className="text-white">
                {endTime ? new Date(new Date(endTime).getTime() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </strong>{' '}
              for inspection & turnaround maintenance.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying & Booking...' : 'Confirm Reservation Request'}
          </button>
        </div>

        {/* Sidebar Summary & Live Rules Check */}
        <div className="space-y-4">
          {/* User Limits Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-xs space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Category Limit Check</span>
            </h3>

            {targetCategory && (
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Category:</span>
                  <span className="font-semibold text-slate-200">{targetCategory.name}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Max Borrow Limit:</span>
                  <span className="font-semibold text-sky-400">{targetCategory.maxBorrowLimit} units</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>User Active/Pending:</span>
                  <span className={`font-semibold ${limitReached ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                    {activeUserBorrowings} / {targetCategory.maxBorrowLimit}
                  </span>
                </div>

                {limitReached && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold mt-2">
                    ⚠️ User has reached maximum borrow limit of {targetCategory.maxBorrowLimit} for this category.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deposit & Fee Structure */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-xs space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Deposit & Fee Policy</span>
            </h3>

            {targetCategory && (
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Deposit Held:</span>
                  <span className="font-bold text-emerald-400">${targetCategory.depositRequired.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Late Fee Rate:</span>
                  <span className="font-bold text-amber-300">${targetCategory.lateFeePerDay.toFixed(2)}/day</span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>Late fees accumulate ONLY Mon-Fri 8:00 AM – 6:00 PM.</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>Fee capped at total deposit (${targetCategory.depositRequired.toFixed(2)} max).</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
