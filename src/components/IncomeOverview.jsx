import React, { useState, useMemo, useRef, useEffect } from 'react';
import { aggregateMonth, calculateProp22, formatCurrency, formatCompact, convertTimeToDecimal } from '../utils/prop22Engine';
import { calculateMonthlySalary } from '../hooks/useShiftStorage';
import MonthlyStatementModal from './MonthlyStatementModal';
import { calculateTipAnalytics, groupEntriesByWeek } from '../utils/statementEngine';
import { getNextPaydaysMultiJob, getW2SalaryForMonth } from '../utils/jobManagerEngine';

// ─── Icons ────────────────────────────────────────────────────────────────────

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M21 12V7H5a2 2 0 010-4h14v4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5v14a2 2 0 002 2h16v-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 12a2 2 0 000 4h4v-4h-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <polyline points="20 12 20 22 4 22 4 12" strokeLinejoin="round" />
    <rect x="2" y="7" width="20" height="5" strokeLinejoin="round" />
    <line x1="12" y1="22" x2="12" y2="7" strokeLinecap="round" />
    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" strokeLinejoin="round" />
    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinejoin="round" />
  </svg>
);

const AdjustIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <line x1="4" y1="21" x2="4" y2="14" strokeLinecap="round" />
    <line x1="4" y1="10" x2="4" y2="3" strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="12" strokeLinecap="round" />
    <line x1="12" y1="8" x2="12" y2="3" strokeLinecap="round" />
    <line x1="20" y1="21" x2="20" y2="16" strokeLinecap="round" />
    <line x1="20" y1="12" x2="20" y2="3" strokeLinecap="round" />
    <line x1="1" y1="14" x2="7" y2="14" strokeLinecap="round" />
    <line x1="9" y1="8" x2="15" y2="8" strokeLinecap="round" />
    <line x1="17" y1="16" x2="23" y2="16" strokeLinecap="round" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedValue({ value, prefix = '$', decimals = 2 }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 700;
    const startTime = performance.now();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [value]);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return <span>{prefix}{formatted}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = false, delay = 0 }) {
  return (
    <div
      className="glass-card-hover p-4 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: 'color-mix(in srgb, var(--accent1) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent1) 35%, transparent)' }}>
          <span style={{ color: 'var(--accent2)' }}>{icon}</span>
        </div>
      </div>
      <p className="font-mono font-bold text-2xl leading-tight" style={{ color: 'var(--accent1)' }}>{value}</p>
      <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-sub)' }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-sub)' }}>{sub}</p>}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function GoalProgressBar({ progressPct, grandTotal, monthlyGoal, remaining }) {
  const barRef = useRef(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const pct = Math.min(100, progressPct);
  const color = pct >= 100 ? '#EDCC8B' : pct >= 75 ? '#BDD1C5' : pct >= 50 ? '#E8B298' : '#A26360';

  const milestones = [25, 50, 75, 100];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent2)' }}><TargetIcon /></span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Goal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
            {pct.toFixed(1)}%
          </span>
          {pct >= 100 && <span className="badge-green">🎯 Goal Reached!</span>}
        </div>
      </div>

      {/* Main Progress Track */}
      <div className="relative">
        <div className="progress-track" style={{ height: '16px' }}>
          <div
            ref={barRef}
            className="progress-fill"
            style={{
              width: animated ? `${pct}%` : '0%',
              transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>

        {/* Milestone Markers */}
        {milestones.map(m => (
          <div
            key={m}
            className="absolute top-0 h-4 flex items-center"
            style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className="w-0.5 h-3"
              style={{ background: pct >= m ? 'color-mix(in srgb, var(--accent2) 60%, transparent)' : 'color-mix(in srgb, var(--text-sub) 20%, transparent)' }}
            />
          </div>
        ))}
      </div>

      {/* Milestone Labels */}
      <div className="flex justify-between text-xs font-mono -mt-2" style={{ color: 'var(--text-sub)' }}>
        <span>$0</span>
        <span>{formatCompact(monthlyGoal * 0.25)}</span>
        <span>{formatCompact(monthlyGoal * 0.50)}</span>
        <span>{formatCompact(monthlyGoal * 0.75)}</span>
        <span>{formatCompact(monthlyGoal)}</span>
      </div>

      {/* Totals Row */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs mb-0.5 font-semibold" style={{ color: 'var(--accent2)' }}>Total Earned</p>
          <p className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
            <AnimatedValue value={grandTotal} />
          </p>
        </div>
        <div className="text-right">
          {remaining > 0 ? (
            <>
              <p className="text-xs mb-0.5 font-semibold" style={{ color: 'var(--accent2)' }}>Remaining</p>
              <p className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
                <AnimatedValue value={remaining} />
              </p>
            </>
          ) : (
            <>
              <p className="text-xs mb-0.5 font-semibold" style={{ color: 'var(--accent2)' }}>Over Goal</p>
              <p className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
                <AnimatedValue value={Math.abs(grandTotal - monthlyGoal)} />
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(settings);

  useEffect(() => { setLocal(settings); }, [settings]);

  const handleApply = () => {
    const rawAmt = parseFloat(local.salaryAmount) ?? parseFloat(local.fixedSalary) ?? 0;
    const freq = local.payFrequency || 'monthly';
    const computedMonthly = calculateMonthlySalary(rawAmt, freq);

    onUpdate({
      workType: local.workType || 'both',
      payFrequency: freq,
      salaryAmount: rawAmt,
      fixedSalary: local.workType === 'gig_only' ? 0 : computedMonthly,
      monthlyGoal: parseFloat(local.monthlyGoal) || 5000,
      localMinWage: parseFloat(local.localMinWage) || 16.90,
      mileRate: parseFloat(local.mileRate) || 0.37,
      theme: local.theme || 'vibrant',
    });
    setOpen(false);
  };

  const currentWorkType = local.workType || 'both';
  const currentFreq = local.payFrequency || 'monthly';
  const currentAmt = parseFloat(local.salaryAmount ?? local.fixedSalary) || 0;
  const liveMonthly = calculateMonthlySalary(currentAmt, currentFreq);

  return (
    <div>
      <button
        id="btn-toggle-settings"
        onClick={() => setOpen(o => !o)}
        className="btn-ghost text-xs gap-1.5 cursor-pointer"
      >
        <EditIcon />
        {open ? 'Close' : 'Configure'}
      </button>

      {open && (
        <div className="mt-4 animate-slide-up space-y-4">
          <div className="section-divider" />

          {/* Work Type Selection */}
          <div>
            <label className="label-text mb-1.5 block">Work Type Profile</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)', border: '1px solid var(--card-border)' }}>
              {[
                { id: 'both', label: '💼 W-2 & Gig' },
                { id: 'gig_only', label: '🚗 Gig Only' },
                { id: 'w2_only', label: '🏢 W-2 Only' },
              ].map(wt => {
                const active = currentWorkType === wt.id;
                return (
                  <button
                    key={wt.id}
                    type="button"
                    onClick={() => setLocal(p => ({ ...p, workType: wt.id }))}
                    className="py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                    style={{
                      background: active ? 'var(--btn-bg)' : 'transparent',
                      color: active ? 'var(--btn-text)' : 'var(--text-sub)',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    {wt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salary & Frequency (if W-2 or Both) */}
          {currentWorkType !== 'gig_only' && (
            <div className="p-3.5 rounded-xl space-y-2.5" style={{ background: 'color-mix(in srgb, var(--accent1) 8%, transparent)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <label className="label-text" style={{ color: 'var(--accent2)' }}>W-2 Salary & Pay Frequency</label>
              </div>

              {/* Pay Frequency Pills */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
                {[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'biweekly', label: 'Bi-Weekly' },
                  { id: 'weekly', label: 'Weekly' },
                ].map(freq => {
                  const active = currentFreq === freq.id;
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setLocal(p => ({ ...p, payFrequency: freq.id }))}
                      className="py-1 rounded-md text-xs font-bold transition-all cursor-pointer text-center"
                      style={{
                        background: active ? 'color-mix(in srgb, var(--accent1) 25%, transparent)' : 'transparent',
                        color: active ? 'var(--accent1)' : 'var(--text-sub)',
                        border: active ? '1px solid var(--accent1)' : '1px solid transparent',
                      }}
                    >
                      {freq.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs" style={{ color: 'var(--accent1)' }}>$</span>
                  <input
                    id="input-fixed-salary"
                    type="number"
                    value={local.salaryAmount ?? local.fixedSalary}
                    onChange={e => setLocal(p => ({ ...p, salaryAmount: e.target.value }))}
                    className="input-field text-sm py-2 pl-7 font-mono font-bold"
                    step="10"
                    placeholder="1830.00"
                  />
                </div>
                {currentAmt > 0 && currentFreq !== 'monthly' && (
                  <p className="text-xs font-semibold mt-1 text-right font-mono" style={{ color: 'var(--accent1)' }}>
                    ≈ ${liveMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Monthly Goal</label>
              <input
                id="input-monthly-goal"
                type="number"
                value={local.monthlyGoal}
                onChange={e => setLocal(p => ({ ...p, monthlyGoal: e.target.value }))}
                className="input-field text-sm py-2 font-mono font-bold"
                step="100"
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Min Wage / hr</label>
              <input
                id="input-min-wage"
                type="number"
                value={local.localMinWage}
                onChange={e => setLocal(p => ({ ...p, localMinWage: e.target.value }))}
                className="input-field text-sm py-2 font-mono"
                step="0.25"
              />
            </div>
            <div className="col-span-2">
              <label className="label-text mb-1.5 block">Mile Rate</label>
              <input
                id="input-mile-rate"
                type="number"
                value={local.mileRate}
                onChange={e => setLocal(p => ({ ...p, mileRate: e.target.value }))}
                className="input-field text-sm py-2 font-mono"
                step="0.01"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="label-text mb-2 block">App Color Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'vibrant', name: 'Terracotta Dark', icon: '🎨', c1: '#EDCC8B', c2: '#A26360' },
                { id: 'vibrant-light', name: 'Terracotta Light', icon: '☀️', c1: '#C07050', c2: '#F8F0E9' },
                { id: 'emerald', name: 'Forest Dark', icon: '🌲', c1: '#34D399', c2: '#070F0B' },
                { id: 'emerald-light', name: 'Forest Light', icon: '🍃', c1: '#059669', c2: '#F0FAF5' },
                { id: 'cyan', name: 'Cyan Dark', icon: '⚡', c1: '#38BDF8', c2: '#060B14' },
                { id: 'cyan-light', name: 'Cyan Light', icon: '🔵', c1: '#0284C7', c2: '#EFF8FF' },
                { id: 'sunset', name: 'Sunset Dark', icon: '🌅', c1: '#FBBF24', c2: '#160D07' },
                { id: 'sunset-light', name: 'Sunrise Light', icon: '🌄', c1: '#D97706', c2: '#FFF9EE' },
              ].map(t => {
                const isSelected = (local.theme || 'vibrant') === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLocal(p => ({ ...p, theme: t.id }))}
                    className="p-2.5 rounded-xl text-left border flex items-center justify-between transition-all"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)',
                      borderColor: isSelected ? t.c1 : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${t.c1}66` : 'none',
                    }}
                  >
                    <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.c1 }} />
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.c2 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button id="btn-apply-settings" onClick={handleApply} className="btn-primary w-full text-sm">
            Apply Settings
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Weekly Breakdown Accordion ───────────────────────────────────────────────

function ShiftBreakdownTable({ entriesArray, settings }) {
  if (entriesArray.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-sub)' }}>
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">No shifts logged this month yet.</p>
        <p className="text-xs mt-1">Select a date on the calendar to get started.</p>
      </div>
    );
  }

  const weeks = useMemo(() => groupEntriesByWeek(entriesArray, settings), [entriesArray, settings]);
  // Default to collapsed mode (empty Set)
  const [openWeeks, setOpenWeeks] = useState(() => new Set());

  const toggleWeek = (label) => {
    setOpenWeeks(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {weeks.map(week => {
        const isOpen = openWeeks.has(week.label);
        const activeShiftsCount = week.entries.filter(e => !e.isOutsideMonth && e.hasShift !== false).length;

        return (
          <div
            key={week.label}
            className="rounded-2xl border overflow-hidden transition-all duration-200"
            style={{
              background: 'var(--drum-bg)',
              borderColor: 'var(--card-border)',
            }}
          >
            {/* Week Header / Dropdown Bar */}
            <div
              onClick={() => toggleWeek(week.label)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none group transition-colors hover:bg-white/5"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {week.label}
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'var(--header-bg)', color: 'var(--accent1)', border: '1px solid var(--card-border)' }}>
                    {activeShiftsCount} shift{activeShiftsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-sub)' }}>
                  {week.totalHours.toFixed(1)} hrs
                  {settings.includeMiles && ` • ${week.totalMiles.toFixed(1)} mi`}
                </p>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="text-right">
                  <p className="font-mono font-bold text-base sm:text-lg" style={{ color: 'var(--accent1)' }}>
                    {formatCurrency(week.totalEarnings)}
                  </p>
                  {week.actualPayout !== null ? (
                    <p className={`text-[10px] font-mono font-bold ${week.variance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Deposit: {formatCurrency(week.actualPayout)} ({week.variance >= 0 ? `+${formatCurrency(week.variance)}` : formatCurrency(week.variance)})
                    </p>
                  ) : (
                    week.totalTopUp > 0 && (
                      <p className="text-[10px] font-bold text-amber-400">
                        ↑{formatCurrency(week.totalTopUp)} Top-Up
                      </p>
                    )
                  )}
                </div>

                <div
                  className="p-2 rounded-xl border transition-all duration-200 group-hover:scale-105"
                  style={{
                    background: isOpen ? 'var(--header-bg)' : 'transparent',
                    borderColor: isOpen ? 'var(--accent1)' : 'var(--card-border)',
                    color: 'var(--accent1)',
                  }}
                >
                  <span
                    className="block transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <ChevronDown />
                  </span>
                </div>
              </div>
            </div>

            {/* Collapsible Daily Table */}
            <div className={isOpen ? "border-t animate-fade-in p-4 sm:p-5" : "hidden"} style={{ borderColor: 'var(--card-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="align-top" style={{ color: 'var(--text-sub)', borderBottom: '1px solid var(--card-border)' }}>
                      <th className="text-left py-2.5 pr-2 font-semibold align-top whitespace-nowrap">Date</th>
                      <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Hrs</th>
                      {settings.includeMiles && <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Mi</th>}
                      <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Base</th>
                      <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Tips</th>
                      <th className="text-center py-2.5 px-2 font-semibold align-top leading-tight">
                        <div>Guaranteed</div>
                        <div className="text-center">Pay</div>
                      </th>
                      <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Top-Up</th>
                      <th className="text-center py-2.5 px-2 font-semibold align-top whitespace-nowrap">Bump</th>
                      <th className="text-center py-2.5 pl-2 font-semibold align-top whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.entries.map(entry => {
                      const dateObj = new Date(entry.date + 'T00:00:00');
                      const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                      const hoursVal = (entry.activeTimeH !== undefined || entry.activeTimeM !== undefined || entry.activeTimeS !== undefined)
                        ? convertTimeToDecimal(entry.activeTimeH, entry.activeTimeM, entry.activeTimeS)
                        : parseFloat(entry.activeHours) || 0;

                      return (
                        <tr
                          key={entry.date}
                          className={`border-b transition-colors ${entry.isOutsideMonth ? 'opacity-50' : 'hover:bg-white/5'}`}
                          style={{ borderColor: 'var(--card-border)' }}
                        >
                          <td className="py-3 pr-2 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--text-primary)' }}>
                                {dayStr}
                              </span>
                              {entry.isOutsideMonth && (
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded border" style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}>
                                  Outside Month
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 font-mono" style={{ color: 'var(--text-sub)' }}>
                            {hoursVal.toFixed(2)}h
                          </td>
                          {settings.includeMiles && (
                            <td className="text-center py-3 px-2 font-mono" style={{ color: 'var(--text-sub)' }}>
                              {entry.activeMiles || 0}mi
                            </td>
                          )}
                          <td className="text-center py-3 px-2 font-mono" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--text-primary)' }}>
                            {formatCurrency(parseFloat(entry.basePay) || 0)}
                          </td>
                          <td className="text-center py-3 px-2 font-mono" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--accent2)' }}>
                            {formatCurrency(parseFloat(entry.tips) || 0)}
                          </td>
                          <td className="text-center py-3 px-2 font-mono" style={{ color: 'var(--text-sub)' }}>
                            {formatCurrency(entry.calc?.prop22Floor || 0)}
                          </td>
                          <td className="text-center py-3 px-2 font-mono text-amber-400 font-bold">
                            {!entry.isOutsideMonth && entry.calc?.adjustmentTopUp > 0 ? formatCurrency(entry.calc.adjustmentTopUp) : '-'}
                          </td>
                          <td className="text-center py-3 px-2 font-mono text-amber-400">
                            -
                          </td>
                          <td className="text-center py-3 pl-2 font-mono font-bold" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--accent1)' }}>
                            {formatCurrency(entry.calc?.totalShiftEarnings || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-xs" style={{ color: 'var(--text-primary)', borderTop: '1.5px solid var(--card-border)' }}>
                      <td className="py-3 pr-2 text-left">Week Total</td>
                      <td className="text-center py-3 px-2 font-mono">{week.totalHours.toFixed(2)}h</td>
                      {settings.includeMiles && <td className="text-center py-3 px-2 font-mono">{week.totalMiles.toFixed(1)}mi</td>}
                      <td className="text-center py-3 px-2 font-mono">{formatCurrency(week.totalBase)}</td>
                      <td className="text-center py-3 px-2 font-mono" style={{ color: 'var(--accent2)' }}>{formatCurrency(week.totalTips)}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatCurrency(week.totalFloor)}</td>
                      <td className="text-center py-3 px-2 font-mono text-amber-400">
                        {week.totalTopUp > 0 ? formatCurrency(week.totalTopUp) : '-'}
                      </td>
                      <td className="text-center py-3 px-2 font-mono text-amber-400">
                        {week.shopperBump > 0 ? formatCurrency(week.shopperBump) : '-'}
                      </td>
                      <td className="text-center py-3 pl-2 font-mono" style={{ color: 'var(--accent1)' }}>
                        {formatCurrency(week.totalEarnings)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main IncomeOverview ──────────────────────────────────────────────────────

export default function IncomeOverview({
  entriesArray,
  settings,
  onUpdateSettings,
  monthLabel,
  viewYear,
  viewMonth,
  onSetMonthYear,
  onMonthChange,
  onNavigateToSettings,
  onOpenStatement
}) {
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  const today = new Date();
  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const availableYears = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const yearsSet = new Set([currentYr, viewYear || currentYr]);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('gigtrack_shifts_')) {
          const yearStr = key.slice(16, 20);
          const yrNum = parseInt(yearStr);
          if (!isNaN(yrNum) && yrNum > 2000 && yrNum <= currentYr + 1) {
            yearsSet.add(yrNum);
          }
        }
      }
    } catch {
      // Ignore
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [viewYear]);

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
  const totalShopperBumps = useMemo(() => {
    return weeks.reduce((sum, w) => sum + (w.shopperBump || 0), 0);
  }, [weeks]);

  const handleOpenStatement = () => {
    if (onOpenStatement) onOpenStatement();
    else setIsStatementOpen(true);
  };

  const paydayList = useMemo(() => getNextPaydaysMultiJob(Array.isArray(settings?.jobs) ? settings.jobs : []), [settings]);

  return (
    <div className="flex flex-col gap-6">

      {/* Upcoming Payday Banners for Active W-2 Jobs */}
      {paydayList.length > 0 && (
        <div className="space-y-2">
          {paydayList.map(item => (
            <div key={item.jobId} className="glass-card p-4 flex items-center justify-between border-emerald-500/30 bg-emerald-500/10 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/30">
                  💵
                </div>
                <div>
                  <p className="font-extrabold text-xs flex items-center gap-1.5" style={{ color: 'var(--accent1)' }}>
                    <span>{item.title}:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{item.formattedDate}</span>
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                    Schedule: <span className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{item.payFrequency}</span> (${item.paycheckAmount.toFixed(2)} expected)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-black shadow-md inline-block">
                  {item.daysRemaining === 0 ? '🎉 PAYDAY TODAY!' : `⏳ ${item.daysRemaining} days left`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header with Interactive Month & Year Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h2>
            {isCurrentMonthView ? (
              <span className="badge-green text-[10px] py-0.5 px-2">Current Month</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  if (onSetMonthYear) onSetMonthYear(now.getFullYear(), now.getMonth());
                }}
                className="badge-amber text-[10px] py-0.5 px-2 font-bold cursor-pointer transition-transform hover:scale-105"
                title="Reset view to current calendar month"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Income Overview & Performance</p>
        </div>

        {/* Month & Year Selection Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {/* Step Back Arrow */}
          <button
            type="button"
            onClick={() => onMonthChange && onMonthChange(-1)}
            className="p-1.5 rounded-xl border transition-all hover:bg-white/10 text-sm font-bold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}
            title="Previous month"
          >
            ‹
          </button>

          {/* Month Selector */}
          <select
            value={viewMonth ?? new Date().getMonth()}
            onChange={e => onSetMonthYear && onSetMonthYear(viewYear ?? new Date().getFullYear(), parseInt(e.target.value))}
            className="input-field text-xs font-bold py-1.5 px-2 font-sans cursor-pointer"
            style={{ background: 'var(--drum-bg)', color: 'var(--text-primary)' }}
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((mName, idx) => (
              <option key={mName} value={idx}>{mName}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={viewYear ?? new Date().getFullYear()}
            onChange={e => onSetMonthYear && onSetMonthYear(parseInt(e.target.value), viewMonth ?? new Date().getMonth())}
            className="input-field text-xs font-bold py-1.5 px-2 font-mono cursor-pointer"
            style={{ background: 'var(--drum-bg)', color: 'var(--accent1)' }}
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {/* Step Forward Arrow */}
          <button
            type="button"
            onClick={() => onMonthChange && onMonthChange(1)}
            className="p-1.5 rounded-xl border transition-all hover:bg-white/10 text-sm font-bold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}
            title="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* Tip Ratio Analytics Banner (if Gig Active) */}
      {settings.workType !== 'w2_only' && (
        <div
          onClick={handleOpenStatement}
          className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer group transition-all hover:scale-[1.01]"
          style={{
            background: 'color-mix(in srgb, var(--accent1) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent1) 25%, transparent)',
          }}
          title="Click to view full statement analytics"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'color-mix(in srgb, var(--accent1) 20%, transparent)', color: 'var(--accent1)' }}>
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent2)' }}>Gig Tip Ratio</p>
                <span className="badge-amber text-[10px] py-0.5 px-2 font-bold">{tipAnalytics.tipRatio}% Tips</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
                Averaging <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>${tipAnalytics.tipPerHour.toFixed(2)}/hr</span> in tips • Click for statement
              </p>
            </div>
          </div>

          <span className="text-xs font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--accent1)' }}>
            Statement →
          </span>
        </div>
      )}

      {/* Goal Progress Card */}
      <div className="glass-card p-5 animate-fade-in">
        <GoalProgressBar
          progressPct={summary.progressPct}
          grandTotal={summary.grandTotal}
          monthlyGoal={settings.monthlyGoal}
          remaining={summary.remaining}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<BriefcaseIcon />}
          label="Fixed Salary"
          value={formatCurrency(settings.workType === 'gig_only' ? 0 : monthFixedSalary)}
          sub={
            settings.workType === 'gig_only'
              ? 'Gig Mode ($0 W-2)'
              : monthFixedSalary === 0
                ? 'Job not started yet'
                : settings.payFrequency === 'biweekly'
                  ? `${formatCurrency(settings.salaryAmount)} bi-weekly`
                  : settings.payFrequency === 'weekly'
                    ? `${formatCurrency(settings.salaryAmount)} weekly`
                    : 'Monthly W-2 baseline'
          }
          accent
          delay={0}
        />
        <StatCard
          icon={<TrendUpIcon />}
          label="Gig Earnings"
          value={formatCurrency(summary.totalGigEarnings + totalShopperBumps)}
          sub={
            totalShopperBumps > 0
              ? `${summary.shiftCount} shifts • incl. ${formatCurrency(totalShopperBumps)} Bumps`
              : `${summary.shiftCount} shift${summary.shiftCount !== 1 ? 's' : ''}`
          }
          accent
          delay={60}
        />
        <StatCard
          icon={<GiftIcon />}
          label="Total Tips"
          value={formatCurrency(summary.totalTips)}
          sub="Customer tips"
          delay={120}
        />
        <StatCard
          icon={<AdjustIcon />}
          label="Top-Ups"
          value={formatCurrency(summary.totalAdjustments)}
          sub="Local Guaranteed Adjustments"
          delay={180}
        />
      </div>

      {/* Breakdown Row */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
          <div className="flex-1 min-w-[120px] flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent3)' }} />
            <span style={{ color: 'var(--text-sub)' }}>Fixed</span>
            <span className="font-mono ml-auto" style={{ color: 'var(--text-primary)' }}>{formatCurrency(settings.fixedSalary)}</span>
          </div>
          <span style={{ color: 'var(--text-sub)' }}>+</span>
          <div className="flex-1 min-w-[120px] flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent2)' }} />
            <span style={{ color: 'var(--text-sub)' }}>Guaranteed Pay</span>
            <span className="font-mono ml-auto" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary.totalProp22Floors)}</span>
          </div>
          <span style={{ color: 'var(--text-sub)' }}>+</span>
          <div className="flex-1 min-w-[120px] flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent1)' }} />
            <span style={{ color: 'var(--text-sub)' }}>Tips</span>
            <span className="font-mono ml-auto" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary.totalTips)}</span>
          </div>
          {totalShopperBumps > 0 && (
            <>
              <span style={{ color: 'var(--text-sub)' }}>+</span>
              <div className="flex-1 min-w-[120px] flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-amber-400" />
                <span style={{ color: 'var(--text-sub)' }}>Bumps</span>
                <span className="font-mono ml-auto text-amber-400 font-bold">{formatCurrency(totalShopperBumps)}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Grand Total</span>
          <span className="font-mono font-bold text-xl" style={{ color: 'var(--accent1)' }}>
            {formatCurrency(summary.grandTotal + totalShopperBumps)}
          </span>
        </div>
        {summary.avgHourlyRate > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-sub)' }}>
            Avg gig rate: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary.avgHourlyRate)}/hr</span>
            {' '}· Guarantee floor: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(settings.localMinWage * (settings.wageMultiplier || 1.2))}/hr</span>
          </p>
        )}
      </div>

      {/* Configurator */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-sub)' }}><WalletIcon /></span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Income Settings</span>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="btn-ghost text-xs gap-1.5 cursor-pointer"
            title="Open Settings tab"
          >
            <EditIcon />
            Edit Settings
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--accent3) 12%, transparent)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Fixed Salary</p>
            <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(settings.fixedSalary)}/mo</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--accent3) 12%, transparent)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Monthly Target</p>
            <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(settings.monthlyGoal)}/mo</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--accent3) 12%, transparent)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Min Wage</p>
            <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(settings.localMinWage)}/hr</p>
          </div>
          {settings.includeMiles && settings.workType !== 'w2_only' && (
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--accent3) 12%, transparent)', border: '1px solid var(--card-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Mile Rate</p>
              <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>${settings.mileRate}/mi</p>
            </div>
          )}
        </div>
      </div>

      {/* Shift Breakdown */}
      <div className="glass-card p-5">
        <p className="label-text mb-4">Shift Breakdown</p>
        <ShiftBreakdownTable entriesArray={entriesArray} settings={settings} />
      </div>

      {/* Monthly Bank Statement Modal */}
      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        entriesArray={entriesArray}
        settings={settings}
        monthLabel={monthLabel}
      />
    </div>
  );
}
