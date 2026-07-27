import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { calculateProp22, calculateMultiGigDay, convertTimeToDecimal, formatCurrency } from '../utils/prop22Engine';
import { groupEntriesByWeek } from '../utils/statementEngine';
import { calculateMonthlySalary, DEFAULT_GIG_PLATFORMS } from '../hooks/useShiftStorage';
import QuickSnapshotModal from './QuickSnapshotModal';
import { getPaydayJobsForDate } from '../utils/jobManagerEngine';
import PaycheckDepositModal from './PaycheckDepositModal';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
    <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinejoin="round" />
    <polyline points="17 21 17 13 7 13 7 21" strokeLinejoin="round" />
    <polyline points="7 3 7 8 15 8" strokeLinejoin="round" />
  </svg>
);

const ITEM_H = 40;

function TimeColumn({ id, value, max, label, onChange }) {
  const count = max + 1;
  const listRef = useRef(null);
  const isInternalRef = useRef(false);

  useEffect(() => {
    if (!listRef.current) return;
    if (isInternalRef.current) {
      isInternalRef.current = false;
      return;
    }
    listRef.current.scrollTop = value * ITEM_H;
  }, [value]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(max, idx));
    if (clamped !== value) {
      isInternalRef.current = true;
      onChange(clamped);
    }
  }, [max, value, onChange]);

  const decrement = () => {
    const next = Math.max(0, value - 1);
    onChange(next);
  };
  const increment = () => {
    const next = Math.min(max, value + 1);
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'var(--accent2)' }}>
        {label}
      </span>

      <button
        type="button"
        onClick={decrement}
        className="flex items-center justify-center w-8 h-6 rounded-lg text-gray-500 hover:text-vibrant-honey hover:bg-white/5 transition-colors duration-150"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
      >
        <ChevronUp />
      </button>

      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          background: 'var(--drum-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div
          className="absolute inset-x-0 pointer-events-none rounded-lg"
          style={{
            top: `${ITEM_H}px`,
            height: `${ITEM_H}px`,
            background: 'color-mix(in srgb, var(--accent1) 15%, transparent)',
            borderTop: '1px solid var(--card-border)',
            borderBottom: '1px solid var(--card-border)',
          }}
        />

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="drum-column overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          style={{ height: `${ITEM_H * 3}px` }}
        >
          <div style={{ height: `${ITEM_H}px` }} />

          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              onClick={() => onChange(i)}
              className="h-10 flex items-center justify-center snap-center cursor-pointer select-none font-mono text-base font-bold transition-colors duration-150"
              style={{
                color: i === value ? 'var(--accent1)' : 'var(--text-sub)',
                opacity: i === value ? 1 : 0.4,
              }}
            >
              {String(i).padStart(2, '0')}
            </div>
          ))}

          <div style={{ height: `${ITEM_H}px` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={increment}
        className="flex items-center justify-center w-8 h-6 rounded-lg text-gray-500 hover:text-vibrant-honey hover:bg-white/5 transition-colors duration-150"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
      >
        <ChevronDown />
      </button>
    </div>
  );
}

function TimePicker({ hours, minutes, seconds, onChangeH, onChangeM, onChangeS }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span style={{ color: 'var(--accent1)' }}>
          <ClockIcon />
        </span>
        <span className="label-text">Active Time Worked</span>
        <span className="ml-auto font-mono text-xs font-bold" style={{ color: 'var(--accent1)' }}>
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <TimeColumn value={hours} max={23} label="Hours" onChange={onChangeH} />
        <span className="font-mono text-xl font-bold self-center mt-3" style={{ color: 'var(--text-sub)' }}>:</span>
        <TimeColumn value={minutes} max={59} label="Mins" onChange={onChangeM} />
        <span className="font-mono text-xl font-bold self-center mt-3" style={{ color: 'var(--text-sub)' }}>:</span>
        <TimeColumn value={seconds} max={59} label="Secs" onChange={onChangeS} />
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function MonthYearPicker({ currentYear, currentMonth, onSelect, onClose }) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 w-72 rounded-2xl border p-4 shadow-2xl animate-scale-in" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <button type="button" onClick={() => setSelectedYear(y => y - 1)} className="p-1 text-xs font-bold" style={{ color: 'var(--accent1)' }}>‹</button>
        <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedYear}</span>
        <button type="button" onClick={() => setSelectedYear(y => y + 1)} className="p-1 text-xs font-bold" style={{ color: 'var(--accent1)' }}>›</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((name, idx) => {
          const isSelected = selectedYear === currentYear && idx === currentMonth;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                onSelect(selectedYear, idx);
                onClose();
              }}
              className="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center"
              style={{
                background: isSelected ? 'var(--btn-bg)' : 'var(--drum-bg)',
                color: isSelected ? 'var(--btn-text)' : 'var(--text-sub)',
                borderColor: isSelected ? 'var(--accent1)' : 'var(--card-border)',
              }}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildCalendarDays(year, month) {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, currentMonth: false, date: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    days.push({ day: d, currentMonth: true, date: `${year}-${mm}-${dd}` });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, currentMonth: false, date: null });
  }

  return days;
}

const EMPTY_FORM = {
  activeTimeH: 0,
  activeTimeM: 0,
  activeTimeS: 0,
  activeMiles: '',
  basePay: '',
  tips: '',
};

function initFormFromEntry(entry) {
  if (!entry) return EMPTY_FORM;

  const milesVal = entry.activeMiles !== undefined && entry.activeMiles !== null ? String(entry.activeMiles) : '';

  if (entry.activeTimeH !== undefined || entry.activeTimeM !== undefined || entry.activeTimeS !== undefined) {
    return {
      activeTimeH: parseInt(entry.activeTimeH, 10) || 0,
      activeTimeM: parseInt(entry.activeTimeM, 10) || 0,
      activeTimeS: parseInt(entry.activeTimeS, 10) || 0,
      activeMiles: milesVal,
      basePay: String(entry.basePay ?? ''),
      tips: String(entry.tips ?? ''),
    };
  }

  const decimal = parseFloat(entry.activeHours) || 0;
  const totalSeconds = Math.round(decimal * 3600);
  return {
    activeTimeH: Math.floor(totalSeconds / 3600),
    activeTimeM: Math.floor((totalSeconds % 3600) / 60),
    activeTimeS: totalSeconds % 60,
    activeMiles: milesVal,
    basePay: String(entry.basePay ?? ''),
    tips: String(entry.tips ?? ''),
  };
}

function ShiftForm({ selectedDate, existingEntry, onSave, onDelete, settings, isExpanded, onToggleExpand }) {
  const activePlatforms = useMemo(() => {
    const list = Array.isArray(settings?.gigPlatforms) && settings.gigPlatforms.length > 0
      ? settings.gigPlatforms
      : DEFAULT_GIG_PLATFORMS;
    return list.filter(p => p.active);
  }, [settings?.gigPlatforms]);

  const [activePlatId, setActivePlatId] = useState(activePlatforms[0]?.id || 'instacart');

  const currentPlatEntry = useMemo(() => {
    if (!existingEntry) return null;
    if (typeof existingEntry === 'object' && !existingEntry.date && !existingEntry.basePay) {
      return existingEntry[activePlatId] || null;
    }
    if (activePlatId === (activePlatforms[0]?.id || 'instacart')) {
      return existingEntry; // Backwards compatibility for single shift
    }
    return null;
  }, [existingEntry, activePlatId, activePlatforms]);

  const [form, setForm] = useState(() => initFormFromEntry(currentPlatEntry));

  useEffect(() => {
    setForm(initFormFromEntry(currentPlatEntry));
  }, [selectedDate, activePlatId, currentPlatEntry]);

  const preview = useMemo(() => {
    const decimal = convertTimeToDecimal(form.activeTimeH, form.activeTimeM, form.activeTimeS);
    const hasAny = decimal > 0 || form.basePay || form.tips || form.activeMiles;
    if (!hasAny) return null;
    return calculateProp22({
      activeTimeH: form.activeTimeH,
      activeTimeM: form.activeTimeM,
      activeTimeS: form.activeTimeS,
      activeMiles: form.activeMiles,
      basePay: form.basePay,
      tips: form.tips,
      localMinWage: settings.localMinWage,
      mileRate: settings.mileRate,
      includeMiles: settings.includeMiles,
      wageMultiplier: settings.wageMultiplier,
    });
  }, [form, settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const cleaned = {
      activeTimeH: form.activeTimeH,
      activeTimeM: form.activeTimeM,
      activeTimeS: form.activeTimeS,
      activeMiles: parseFloat(form.activeMiles) || 0,
      activeHours: convertTimeToDecimal(form.activeTimeH, form.activeTimeM, form.activeTimeS),
      basePay: parseFloat(form.basePay) || 0,
      tips: parseFloat(form.tips) || 0,
      platformId: activePlatId,
      date: selectedDate,
    };

    let updatedDayEntry = {};
    if (existingEntry && typeof existingEntry === 'object' && !existingEntry.date && !existingEntry.basePay) {
      updatedDayEntry = { ...existingEntry, [activePlatId]: cleaned };
    } else if (existingEntry && existingEntry.date) {
      const oldPlatId = activePlatforms[0]?.id || 'instacart';
      updatedDayEntry = { [oldPlatId]: existingEntry, [activePlatId]: cleaned };
    } else {
      updatedDayEntry = { [activePlatId]: cleaned };
    }

    onSave(selectedDate, updatedDayEntry);
  };

  const totalDecimal = convertTimeToDecimal(form.activeTimeH, form.activeTimeM, form.activeTimeS);
  const isValid = totalDecimal > 0;

  const [year, month, day] = selectedDate.split('-').map(Number);
  const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const dayMultiCalc = useMemo(() => calculateMultiGigDay(existingEntry, settings), [existingEntry, settings]);
  const existingTotal = dayMultiCalc.totalShiftEarnings;

  return (
    <div className="animate-slide-up">
      <div
        id="card-selected-shift"
        onClick={onToggleExpand}
        className="flex items-center justify-between cursor-pointer select-none py-1 group"
        title={isExpanded ? "Collapse shift details" : "Expand shift details"}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="label-text">Selected Shift</p>
            {existingEntry ? (
              <div className="flex items-center gap-1.5">
                <span className="badge-green text-[10px] py-0.5 px-2">
                  ✓ {formatCurrency(existingTotal)}
                </span>
                {existingEntry.activeMiles > 0 && settings?.includeMiles && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)', color: 'var(--accent1)' }}>
                    🚗 {existingEntry.activeMiles} mi
                  </span>
                )}
              </div>
            ) : (
              <span className="badge-amber text-[10px] py-0.5 px-2">
                Tap to Log
              </span>
            )}
          </div>
          <p className="font-semibold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
            {displayDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {existingEntry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(selectedDate);
              }}
              className="p-2 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors duration-200"
              title="Delete shift"
            >
              <TrashIcon />
            </button>
          )}

          <div
            className="p-2 rounded-xl border transition-all duration-200 group-hover:scale-105"
            style={{
              background: isExpanded ? 'color-mix(in srgb, var(--accent1) 18%, transparent)' : 'color-mix(in srgb, var(--bg) 60%, transparent)',
              borderColor: isExpanded ? 'var(--accent1)' : 'var(--card-border)',
              color: 'var(--accent1)',
            }}
          >
            <span
              className="block transition-transform duration-300"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <ChevronDown />
            </span>
          </div>
        </div>
      </div>

      <div className={isExpanded ? "animate-fade-in pt-3" : "hidden"}>
        <div className="section-divider" />

        {/* Active Platforms Selector Pills */}
        {activePlatforms.length > 0 && (
          <div className="flex gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-gray-800 mb-4 overflow-x-auto select-none">
            {activePlatforms.map(plat => {
              const hasPlatData = existingEntry && (existingEntry[plat.id] || (existingEntry.date && plat.id === activePlatforms[0]?.id));
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setActivePlatId(plat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activePlatId === plat.id
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{plat.icon}</span>
                  <span>{plat.name}</span>
                  {hasPlatData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="mb-4">
          <TimePicker
            hours={form.activeTimeH}
            minutes={form.activeTimeM}
            seconds={form.activeTimeS}
            onChangeH={useCallback(h => setForm(p => ({ ...p, activeTimeH: h })), [])}
            onChangeM={useCallback(m => setForm(p => ({ ...p, activeTimeM: m })), [])}
            onChangeS={useCallback(s => setForm(p => ({ ...p, activeTimeS: s })), [])}
          />
        </div>

        <div className={`grid ${settings?.includeMiles ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-5`}>
          {settings?.includeMiles && (
            <div>
              <label className="label-text mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent2)' }}>
                Active Miles
              </label>
              <input
                id="input-active-miles"
                type="number"
                name="activeMiles"
                value={form.activeMiles || ''}
                onChange={handleChange}
                className="input-field"
                placeholder="12.5"
                min="0"
                step="0.1"
              />
            </div>
          )}

          <div>
            <label className="label-text mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent2)' }}>
              <span style={{ color: 'var(--accent1)' }}><DollarIcon /></span>
              Base Pay
            </label>
            <input
              id="input-base-pay"
              type="number"
              name="basePay"
              value={form.basePay}
              onChange={handleChange}
              className="input-field"
              placeholder="45.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="label-text mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent2)' }}>
              <span style={{ color: 'var(--accent2)' }}><HeartIcon /></span>
              Tips
            </label>
            <input
              id="input-tips"
              type="number"
              name="tips"
              value={form.tips}
              onChange={handleChange}
              className="input-field"
              placeholder="18.50"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {preview && (
          <div
            className="rounded-xl p-4 mb-5 animate-fade-in"
            style={{
              background: 'color-mix(in srgb, var(--accent1) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent1) 25%, transparent)',
            }}
          >
            <p className="label-text mb-3" style={{ color: 'var(--accent2)' }}>Live Guarantee Preview</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="font-mono font-semibold text-lg" style={{ color: 'var(--accent1)' }}>
                  {formatCurrency(preview.prop22Floor)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>Pay Floor</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-semibold text-lg" style={{ color: preview.adjustmentTopUp > 0 ? 'var(--accent1)' : 'var(--text-sub)' }}>
                  {formatCurrency(preview.adjustmentTopUp)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>Top-Up</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-semibold text-lg" style={{ color: 'var(--accent1)' }}>
                  {formatCurrency(preview.totalShiftEarnings)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>Total</p>
              </div>
            </div>
            {preview.adjustmentTopUp > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="badge-amber">⚡ Top-Up Eligible</span>
                <span className="text-xs" style={{ color: 'var(--text-sub)' }}>Base pay adjustment: +{formatCurrency(preview.adjustmentTopUp)}</span>
              </div>
            )}
            {preview.receivedFullGuarantee && (
              <div className="mt-3 flex items-center gap-2">
                <span className="badge-green">✓ Floor Met</span>
                <span className="text-xs" style={{ color: 'var(--text-sub)' }}>Base pay covers guarantee floor</span>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-save-shift"
          onClick={handleSave}
          disabled={!isValid}
          className={`btn-primary w-full ${!isValid ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <SaveIcon />
          {existingEntry ? 'Update Shift' : 'Log Shift'}
        </button>
      </div>
    </div>
  );
}

function PayPeriodPayoutsCard({ viewYear, viewMonth, entries, settings, onUpdateSettings }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const targetMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const entriesArray = useMemo(() => Object.values(entries || {}).sort((a, b) => a.date.localeCompare(b.date)), [entries]);

  const groupedWeeks = useMemo(
    () => groupEntriesByWeek(entriesArray, settings, targetMonthStr),
    [entriesArray, settings, targetMonthStr]
  );

  const actualPayouts = settings?.actualPayouts || {};
  const shopperBumps = settings?.shopperBumps || {};
  const actualW2Paychecks = settings?.actualW2Paychecks || {};

  const actualW2Val = actualW2Paychecks[targetMonthStr] ?? '';
  const rawAmt = parseFloat(settings?.salaryAmount) ?? parseFloat(settings?.fixedSalary) ?? 0;
  const freq = settings?.payFrequency || 'monthly';
  const expectedW2Salary = calculateMonthlySalary(rawAmt, freq);
  const numericW2Val = parseFloat(actualW2Val) || expectedW2Salary;
  const w2Variance = numericW2Val - expectedW2Salary;

  const handlePayoutChange = (payoutKey, val) => {
    const nextPayouts = { ...actualPayouts, [payoutKey]: val };
    if (onUpdateSettings) {
      onUpdateSettings({ actualPayouts: nextPayouts });
    }
  };

  const handleBumpChange = (payoutKey, val) => {
    const nextBumps = { ...shopperBumps, [payoutKey]: val };
    if (onUpdateSettings) {
      onUpdateSettings({ shopperBumps: nextBumps });
    }
  };

  const handleW2PaycheckChange = (monthKey, val) => {
    const nextW2 = { ...actualW2Paychecks, [monthKey]: val };
    if (onUpdateSettings) {
      onUpdateSettings({ actualW2Paychecks: nextW2 });
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div
        onClick={() => setIsExpanded(o => !o)}
        className="flex items-center justify-between cursor-pointer select-none py-1 group"
        title={isExpanded ? "Collapse weekly payouts" : "Expand weekly payouts"}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="label-text">Pay Period Alignment</p>
            <span className="badge-green text-[10px] py-0.5 px-2 font-mono">
              💵 Bank Stub Sync
            </span>
          </div>
          <p className="font-semibold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
            Actual Paycheck & Gig Bank Payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-xl border transition-all duration-200 group-hover:scale-105"
            style={{
              background: isExpanded ? 'color-mix(in srgb, var(--accent1) 18%, transparent)' : 'color-mix(in srgb, var(--bg) 60%, transparent)',
              borderColor: isExpanded ? 'var(--accent1)' : 'var(--card-border)',
              color: 'var(--accent1)',
            }}
          >
            <span
              className="block transition-transform duration-300"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <ChevronDown />
            </span>
          </div>
        </div>
      </div>

      <div className={isExpanded ? "animate-fade-in pt-3 space-y-3" : "hidden"}>
        <div className="section-divider" />

        <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
          Input your actual weekly bank deposit payout stub or Shopper Bumps for each weekly pay period.
        </p>

        <div className="space-y-3">
          {groupedWeeks.map((week, idx) => {
            const labelKey = week.weekLabel;
            const actualVal = actualPayouts[labelKey] ?? actualPayouts[week.payoutKey] ?? '';
            const bumpVal = shopperBumps[labelKey] ?? shopperBumps[week.payoutKey] ?? '';

            const isSplitWeek = week.fullWeekCalculatedEarnings !== week.totalEarnings;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}
              >
                <div>
                  <p className="font-bold text-xs" style={{ color: 'var(--accent1)' }}>{week.label}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-sub)' }}>
                    EvryTrack Calc: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(week.totalEarnings)}</span>
                    {week.shopperBump > 0 && (
                      <span className="ml-1.5 font-bold text-amber-400">
                        (+{formatCurrency(week.shopperBump)} Bump{week.fullWeekShopperBump > week.shopperBump ? ` of ${formatCurrency(week.fullWeekShopperBump)}` : ''})
                      </span>
                    )}
                  </p>
                  {isSplitWeek && week.actualPayout !== null && (
                    <p className="text-[10px] font-mono mt-0.5 text-emerald-400 font-semibold">
                      Month Share: {formatCurrency(week.actualPayout)} of {formatCurrency(week.fullDeposit)} deposit
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Shopper Bump Input */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-sub)' }} title="Shopper Bump / Incident Compensation added outside Prop 22 adjustments">
                      🎁 Bump:
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-amber-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={bumpVal}
                        onChange={e => handleBumpChange(labelKey, e.target.value)}
                        className="input-field text-xs py-1 pl-6 w-20 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Full Weekly Bank Deposit Input */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-sub)' }}>
                      Full Bank Deposit:
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs" style={{ color: 'var(--accent1)' }}>
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={(week.fullWeekCalculatedEarnings || week.totalEarnings).toFixed(2)}
                        value={actualVal}
                        onChange={e => handlePayoutChange(labelKey, e.target.value)}
                        className="input-field text-xs py-1 pl-6 w-24 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {week.actualPayout !== null ? (
                    <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${week.variance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {week.variance >= 0 ? `+${formatCurrency(week.variance)}` : formatCurrency(week.variance)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono italic" style={{ color: 'var(--text-sub)' }}>
                      Optional
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ShiftLogger ──────────────────────────────────────────────────────────

export default function ShiftLogger({ entries, onSaveEntry, onDeleteEntry, viewYear, viewMonth, onMonthChange, onSetMonthYear, settings, onUpdateSettings }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [paycheckModalOpen, setPaycheckModalOpen] = useState(false);
  const [paydayModalDate, setPaydayModalDate] = useState('');
  const [paydayModalJobs, setPaydayModalJobs] = useState([]);

  const handlePrevMonth = () => onMonthChange(-1);
  const handleNextMonth = () => onMonthChange(1);

  const handleDayClick = (dayObj) => {
    if (!dayObj.currentMonth || !dayObj.date) return;
    setSelectedDate(dayObj.date);
    setIsFormExpanded(true);
  };

  const handlePaydayBadgeClick = (e, dayObj) => {
    e.stopPropagation();
    if (!dayObj.currentMonth || !dayObj.date) return;
    setSelectedDate(dayObj.date);
    const pJobs = getPaydayJobsForDate(dayObj.date, Array.isArray(settings?.jobs) ? settings.jobs : []);
    if (pJobs.length > 0) {
      setPaydayModalDate(dayObj.date);
      setPaydayModalJobs(pJobs);
      setPaycheckModalOpen(true);
    }
  };

  const handleSavePaycheckDeposit = ({ dateStr, jobId, actualAmount, notes }) => {
    const existingPaychecks = { ...(settings.actualPaychecks || {}) };
    existingPaychecks[`${dateStr}_${jobId}`] = {
      dateStr,
      jobId,
      amount: actualAmount,
      notes,
      loggedAt: new Date().toISOString(),
    };
    if (typeof onUpdateSettings === 'function') {
      onUpdateSettings({ actualPaychecks: existingPaychecks });
    }
  };

  const existingEntry = entries[selectedDate] || null;

  const scrollToSelectedCard = () => {
    setTimeout(() => {
      document.getElementById('card-selected-shift')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Calendar Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            id="btn-prev-month"
            onClick={handlePrevMonth}
            className="btn-ghost px-3 py-2"
          >
            <ChevronLeft />
          </button>

          <div className="relative text-center">
            <button
              id="btn-month-picker"
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-1.5 font-bold text-lg hover:opacity-80 transition-opacity cursor-pointer mx-auto"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <span
                className="transition-transform duration-200"
                style={{ display: 'inline-block', transform: pickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--accent1)' }}
              >
                <ChevronDown />
              </span>
            </button>

            {isCurrentMonthView && !pickerOpen ? (
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>Current Month</p>
            ) : !isCurrentMonthView && !pickerOpen ? (
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onSetMonthYear(now.getFullYear(), now.getMonth());
                }}
                className="badge-amber text-[10px] py-0.5 px-2 font-bold cursor-pointer transition-transform hover:scale-105 mt-1"
                title="Reset view to current calendar month"
              >
                ↺ Reset
              </button>
            ) : null}

            {pickerOpen && (
              <MonthYearPicker
                currentYear={viewYear}
                currentMonth={viewMonth}
                onSelect={onSetMonthYear}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <button
            id="btn-next-month"
            onClick={handleNextMonth}
            className="btn-ghost px-3 py-2"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--text-sub)' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayObj, idx) => {
            const isToday = dayObj.date === todayStr;
            const isSelected = dayObj.date === selectedDate;
            const hasData = dayObj.date && !!entries[dayObj.date];
            const paydayJobs = dayObj.date ? getPaydayJobsForDate(dayObj.date, Array.isArray(settings?.jobs) ? settings.jobs : []) : [];

            let cls = 'cal-day';
            if (!dayObj.currentMonth) cls += ' other-month';
            if (isToday && !isSelected) cls += ' today';
            if (isSelected) cls += ' selected';
            if (hasData) cls += ' has-data';

            return (
              <div
                key={idx}
                className={cls}
                onClick={() => handleDayClick(dayObj)}
                role="button"
                tabIndex={dayObj.currentMonth ? 0 : -1}
                aria-label={dayObj.date ? `Select ${dayObj.date}` : undefined}
                onKeyDown={e => e.key === 'Enter' && handleDayClick(dayObj)}
              >
                <span
                  className="text-sm font-medium leading-none"
                  style={{
                    color: isSelected ? 'var(--accent1)' :
                      isToday ? 'var(--accent1)' :
                        dayObj.currentMonth ? 'var(--text-primary)' : 'var(--text-sub)',
                    fontWeight: isSelected || isToday ? '700' : '500',
                    opacity: dayObj.currentMonth ? 1 : 0.35,
                  }}
                >
                  {dayObj.day}
                </span>

                {paydayJobs.length > 0 && dayObj.currentMonth && (
                  <span
                    onClick={(e) => handlePaydayBadgeClick(e, dayObj)}
                    className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/40 mt-0.5 tracking-tighter cursor-pointer hover:bg-emerald-500/40 hover:scale-105 transition-all"
                    title={`Click to log bank deposit for: ${paydayJobs.map(j => `${j.title} ($${j.paycheckAmount})`).join(', ')}`}
                  >
                    💰 {paydayJobs.length > 1 ? `PAYDAYS (${paydayJobs.length})` : 'PAYDAY'}
                  </span>
                )}
                {hasData && (
                  <span className="text-[9px] font-mono font-bold mt-1 leading-none" style={{ color: 'var(--accent1)' }}>
                    {formatCurrency(
                      calculateProp22({
                        ...entries[dayObj.date],
                        localMinWage: settings.localMinWage,
                        mileRate: settings.mileRate,
                        includeMiles: settings.includeMiles,
                        wageMultiplier: settings.wageMultiplier,
                      }).totalShiftEarnings
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                const loggedDates = Object.keys(entries).filter(d => !!entries[d]).sort();
                if (loggedDates.length === 0) return;
                const nextDate = loggedDates.find(d => d > selectedDate) || loggedDates[0];
                const [y, m] = nextDate.split('-').map(Number);
                onSetMonthYear(y, m - 1);
                setSelectedDate(nextDate);
                setIsFormExpanded(true);
                scrollToSelectedCard();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
              style={{ color: 'var(--text-sub)' }}
              title="Jump to next logged shift and open details"
            >
              <span className="glow-dot w-2 h-2" />
              Shift logged
            </button>

            <button
              type="button"
              onClick={() => {
                onSetMonthYear(today.getFullYear(), today.getMonth());
                setSelectedDate(todayStr);
                setIsFormExpanded(true);
                scrollToSelectedCard();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
              style={{ color: 'var(--text-sub)' }}
              title="Jump to Today's date and open details"
            >
              <span className="w-3.5 h-3.5 rounded-md border inline-block" style={{ borderColor: 'var(--accent2)', background: 'color-mix(in srgb, var(--accent2) 20%, transparent)' }} />
              Today
            </button>
          </div>

          {/* Quick Snapshot Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSnapshotOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 shadow-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent1) 15%, transparent)',
              color: 'var(--accent1)',
              border: '1px solid color-mix(in srgb, var(--accent1) 30%, transparent)'
            }}
            title="Open Quick Financial Snapshot Modal for this month"
          >
            <span>📊</span>
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Shift Form Card */}
      <div className="glass-card p-5">
        <ShiftForm
          selectedDate={selectedDate}
          existingEntry={existingEntry}
          onSave={onSaveEntry}
          onDelete={onDeleteEntry}
          settings={settings}
          isExpanded={isFormExpanded}
          onToggleExpand={() => setIsFormExpanded(o => !o)}
        />
      </div>

      {/* Actual Weekly App Payouts Card */}
      <PayPeriodPayoutsCard
        viewYear={viewYear}
        viewMonth={viewMonth}
        entries={entries}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      <QuickSnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        entriesArray={Object.values(entries || {})}
        settings={settings}
        viewYear={viewYear}
        viewMonth={viewMonth}
      />

      {/* Paycheck Deposit Logger Modal for Payday Dates */}
      <PaycheckDepositModal
        isOpen={paycheckModalOpen}
        onClose={() => setPaycheckModalOpen(false)}
        dateStr={paydayModalDate}
        paydayJobs={paydayModalJobs}
        settings={settings}
        onSavePaycheck={handleSavePaycheckDeposit}
      />
    </div>
  );
}
