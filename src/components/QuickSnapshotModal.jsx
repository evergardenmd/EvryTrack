import React, { useMemo } from 'react';
import { aggregateMonth, formatCurrency } from '../utils/prop22Engine';
import { calculateTipAnalytics, groupEntriesByWeek } from '../utils/statementEngine';
import { getW2SalaryForMonth } from '../utils/jobManagerEngine';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function QuickSnapshotModal({ isOpen, onClose, entriesArray = [], settings = {}, viewYear = new Date().getFullYear(), viewMonth = new Date().getMonth(), monthLabel = '' }) {
  if (!isOpen) return null;

  const monthFixedSalary = useMemo(() => getW2SalaryForMonth(viewYear, viewMonth, settings), [viewYear, viewMonth, settings]);

  const summary = useMemo(
    () => aggregateMonth(entriesArray, monthFixedSalary, settings.monthlyGoal, settings.localMinWage, settings.mileRate, settings.includeMiles),
    [entriesArray, monthFixedSalary, settings]
  );

  const tipAnalytics = useMemo(
    () => calculateTipAnalytics(entriesArray, settings),
    [entriesArray, settings]
  );

  const weeks = useMemo(() => groupEntriesByWeek(entriesArray, settings), [entriesArray, settings]);

  const totalMiles = useMemo(() => {
    return entriesArray.reduce((sum, e) => sum + (parseFloat(e.activeMiles) || 0), 0);
  }, [entriesArray]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="font-bold text-base tracking-tight" style={{ color: 'var(--accent1)' }}>
                Quick Month Snapshot
              </h2>
              <p className="text-xs font-mono" style={{ color: 'var(--text-sub)' }}>
                {monthLabel} Financial Summary
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-sub)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-left">
          {/* Executive Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--accent1)' }}>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Grand Total Income</p>
              <p className="font-mono font-bold text-xl" style={{ color: 'var(--accent1)' }}>
                {formatCurrency(summary.grandTotal || tipAnalytics.totalGigEarnings)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-sub)' }}>All sources combined</p>
            </div>

            <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Active Time & Miles</p>
              <p className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {(tipAnalytics.totalHours || 0).toFixed(1)} hrs
              </p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-sub)' }}>
                {settings.includeMiles ? `${totalMiles} mi driven` : 'Time logged'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Effective Rate</p>
              <p className="font-mono font-bold text-base" style={{ color: 'var(--accent2)' }}>
                ${(tipAnalytics.totalGigPerHour || 0).toFixed(2)}/hr
              </p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-sub)' }}>
                incl. ${(tipAnalytics.tipPerHour || 0).toFixed(2)}/hr tips
              </p>
            </div>
          </div>

          {/* Category Earnings Breakdown */}
          <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent2)' }}>
              Earnings Composition
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Base Pay ({tipAnalytics.baseRatio}%)</p>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(tipAnalytics.totalBase)}</p>
              </div>

              <div className="p-2.5 rounded-xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Tips ({tipAnalytics.tipRatio}%)</p>
                <p className="font-bold text-sm" style={{ color: 'var(--accent2)' }}>{formatCurrency(tipAnalytics.totalTips)}</p>
              </div>

              <div className="p-2.5 rounded-xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Top-Ups ({tipAnalytics.topUpRatio}%)</p>
                <p className="font-bold text-sm text-amber-400">{formatCurrency(tipAnalytics.totalTopUp)}</p>
              </div>

              <div className="p-2.5 rounded-xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Bumps ({tipAnalytics.bumpRatio || 0}%)</p>
                <p className="font-bold text-sm text-amber-400">+{formatCurrency(tipAnalytics.totalShopperBumps)}</p>
              </div>
            </div>
          </div>

          {/* Itemized Weekly Pay Periods Table */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent2)' }}>
              Pay Period Summary ({weeks.length} Weeks)
            </p>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="align-top" style={{ color: 'var(--text-sub)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="text-left py-2.5 px-3 font-semibold">Pay Period</th>
                    <th className="text-center py-2.5 px-2 font-semibold">Hrs</th>
                    <th className="text-center py-2.5 px-2 font-semibold">Base</th>
                    <th className="text-center py-2.5 px-2 font-semibold">Tips</th>
                    <th className="text-center py-2.5 px-2 font-semibold">Top-Up</th>
                    <th className="text-center py-2.5 px-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, idx) => (
                    <tr key={idx} className="border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                      <td className="py-2.5 px-3 text-left font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                        {week.label.replace('Pay Period: ', '')}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono" style={{ color: 'var(--text-sub)' }}>
                        {week.totalHours}h
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(week.totalBase)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono" style={{ color: 'var(--accent2)' }}>
                        {formatCurrency(week.totalTips)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-amber-400 font-bold">
                        {week.totalTopUp > 0 ? `+${formatCurrency(week.totalTopUp)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                        {formatCurrency(week.totalEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
          <button
            onClick={onClose}
            className="btn-primary py-2 px-6 text-xs"
          >
            Close Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}
