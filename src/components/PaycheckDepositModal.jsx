import React, { useState, useEffect } from 'react';

/**
 * PaycheckDepositModal Component
 * Opens when a user clicks on a 💰 PAYDAY date on the calendar in ShiftLogger.
 * Allows logging exact actual net deposit received for each employer paycheck.
 */
export default function PaycheckDepositModal({ isOpen, onClose, dateStr, paydayJobs = [], settings = {}, onSavePaycheck }) {
  const [actualDeposit, setActualDeposit] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [notes, setNotes] = useState('');

  const targetJob = paydayJobs.find(j => j.id === selectedJobId) || paydayJobs[0] || {};
  const expectedAmount = parseFloat(targetJob.paycheckAmount) || 0;

  useEffect(() => {
    if (paydayJobs.length > 0) {
      const firstJob = paydayJobs[0];
      setSelectedJobId(firstJob.id);
      
      // Load existing logged paycheck for this date & job if available
      const existingPaychecks = settings.actualPaychecks || {};
      const key = `${dateStr}_${firstJob.id}`;
      if (existingPaychecks[key] !== undefined) {
        setActualDeposit(existingPaychecks[key].amount || '');
        setNotes(existingPaychecks[key].notes || '');
      } else {
        setActualDeposit(firstJob.paycheckAmount || '');
        setNotes('');
      }
    }
  }, [isOpen, dateStr, paydayJobs, settings]);

  if (!isOpen || paydayJobs.length === 0) return null;

  const numericActual = parseFloat(actualDeposit) || 0;
  const variance = numericActual - expectedAmount;

  const handleSave = (e) => {
    e.preventDefault();
    if (typeof onSavePaycheck === 'function') {
      onSavePaycheck({
        dateStr,
        jobId: targetJob.id,
        expectedAmount,
        actualAmount: numericActual,
        notes: notes.trim(),
      });
    }
    onClose();
  };

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-4 bg-slate-900 border-emerald-500/40 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-400">Log Actual Paycheck Deposit</h3>
              <p className="text-[10px] text-gray-400 font-mono">{formattedDate}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-gray-700 bg-slate-800 text-gray-400 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Employer Selector if multiple jobs on same date */}
        {paydayJobs.length > 1 && (
          <div>
            <label className="block text-[11px] font-bold text-gray-300 mb-1">Select Employer</label>
            <div className="flex gap-1.5 p-1 bg-slate-800 rounded-xl border border-gray-700">
              {paydayJobs.map(j => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelectedJobId(j.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedJobId === j.id ? 'bg-emerald-500 text-black' : 'text-gray-400'
                  }`}
                >
                  {j.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Expected vs Actual Box */}
          <div className="p-3.5 rounded-2xl border bg-slate-800/80 border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">Employer:</span>
              <span className="font-bold text-white">{targetJob.title}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">Expected Check:</span>
              <span className="font-mono font-bold text-emerald-400">${expectedAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Actual Deposit Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 mb-1">
              Actual Bank Deposit Received ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-emerald-400">$</span>
              <input
                type="number"
                step="0.01"
                placeholder={expectedAmount.toFixed(2)}
                value={actualDeposit}
                onChange={e => setActualDeposit(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border bg-slate-950 border-emerald-500/50 text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Variance Calculation Badge */}
          {actualDeposit !== '' && (
            <div className={`p-2.5 rounded-xl border text-center font-mono text-xs font-bold flex items-center justify-between ${
              variance >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <span>Variance vs Expected:</span>
              <span>{variance >= 0 ? `+$${variance.toFixed(2)}` : `-$${Math.abs(variance).toFixed(2)}`}</span>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 mb-1">Notes / Stub Ref (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Includes $25 overtime bump"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-gray-300 border border-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-black cursor-pointer shadow-lg hover:bg-emerald-400"
            >
              Save Paycheck Deposit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
