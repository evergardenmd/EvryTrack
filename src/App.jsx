import React, { useState, useEffect, useCallback } from 'react';
import ShiftLogger from './components/ShiftLogger';
import IncomeOverview from './components/IncomeOverview';
import OnboardingModal from './components/OnboardingModal';
import WelcomeOnboardingModal from './components/WelcomeOnboardingModal';
import SettingsView from './components/SettingsView';
import MonthlyStatementModal from './components/MonthlyStatementModal';
import { useShiftStorage, useIncomeSettings } from './hooks/useShiftStorage';
import { generateSeedData, getMonthKey } from './utils/prop22Engine';
import { exportBackupData, parseBackupFile, saveAllImportedEntriesToStorage } from './utils/syncEngine';

// ─── Navigation Icons ─────────────────────────────────────────────────────────

const CalendarIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChartIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
    <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" />
    <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
    <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" />
  </svg>
);

const GearIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const LeafIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M11 20A7 7 0 0118 4a7 7 0 00-7 7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 20l7-7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 4l-1 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Month Utils ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getYearMonth(year, month) {
  const d = new Date(year, month, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ monthLabel, userName, onOpenStatement }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const hour = now.getHours();

  let salutation = 'Good morning';
  let icon = '☀️';
  if (hour >= 12 && hour < 17) {
    salutation = 'Good afternoon';
    icon = '☀️';
  } else if (hour >= 17 || hour < 5) {
    salutation = 'Good evening';
    icon = '🌅';
  }

  const nameStr = userName?.trim() ? `, ${userName.trim()}` : '';
  const greeting = `${icon} ${salutation}${nameStr}!`;

  return (
    <header className="sticky top-0 z-50 px-4 py-3" style={{
      background: 'var(--header-bg)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1.5px solid var(--card-border)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    }}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl flex items-center justify-center" style={{
            background: 'color-mix(in srgb, var(--accent1) 18%, transparent)',
            border: '1.5px solid var(--accent1)',
          }}>
            <span style={{ color: 'var(--accent1)' }}><LeafIcon /></span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              EvryTrack
            </h1>
            <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-sub)' }}>
              <span>{greeting}</span>
              <span>•</span>
              <span>{timeStr}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onOpenStatement}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          style={{
            background: 'var(--accent1)',
            color: 'var(--btn-text)',
          }}
        >
          <span>📄</span>
          <span>Statements</span>
        </button>
      </div>
    </header>
  );
}

// ─── Welcome Banner ───────────────────────────────────────────────────────────

function WelcomeBanner({ userName }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const hour = new Date().getHours();
  let salutation = 'Good morning';
  let icon = '☀️';
  if (hour >= 12 && hour < 17) {
    salutation = 'Good afternoon';
    icon = '☀️';
  } else if (hour >= 17 || hour < 5) {
    salutation = 'Good evening';
    icon = '🌅';
  }

  const nameStr = userName?.trim() ? `, ${userName.trim()}` : '';

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-down max-w-sm w-[90%] px-4 py-2.5 rounded-2xl border shadow-2xl flex items-center justify-between gap-3 select-none"
      style={{
        background: 'var(--header-bg)',
        borderColor: 'var(--accent1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="font-bold text-xs leading-tight" style={{ color: 'var(--accent1)' }}>
            Welcome back{nameStr}!
          </p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-sub)' }}>
            {salutation} • EvryTrack Session Active
          </p>
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-xs p-1.5 rounded-xl hover:bg-white/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
        style={{ color: 'var(--text-sub)' }}
        title="Dismiss welcome message"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ activeTab, onTabChange, settings }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe" style={{
      background: 'var(--header-bg)',
      backdropFilter: 'blur(20px)',
      borderTop: '1.5px solid var(--card-border)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
    }}>
      <div className="max-w-2xl mx-auto flex">
        {[
          ...(settings?.workType !== 'w2_only' ? [{ id: 'logger', label: 'Log Shift', Icon: CalendarIcon }] : []),
          { id: 'overview', label: 'Overview', Icon: ChartIcon },
          { id: 'settings', label: 'Settings', Icon: GearIcon },
        ].map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative"
              style={{
                color: active ? 'var(--accent1)' : 'var(--text-sub)',
              }}
            >
              <Icon active={active} />
              <span
                className="text-[11px] font-bold tracking-wide transition-colors"
                style={{
                  color: active ? 'var(--accent1)' : 'var(--text-sub)',
                }}
              >
                {label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full" style={{
                  background: 'linear-gradient(90deg, var(--accent3), var(--accent1), var(--accent2))',
                  boxShadow: '0 0 10px var(--accent1)',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [activeTab, setActiveTab] = useState('logger');
  const [seedLoaded, setSeedLoaded] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  const monthKey = getMonthKey(new Date(viewYear, viewMonth, 1));
  const { entries, saveEntry, deleteEntry, entriesArray } = useShiftStorage(monthKey);
  const { settings, updateSettings } = useIncomeSettings();

  useEffect(() => {
    setSeedLoaded(true);
  }, []);

  useEffect(() => {
    if (settings.onboardingCompleted === false) {
      setIsWelcomeOpen(true);
    } else {
      setIsWelcomeOpen(false);
    }
  }, [settings.onboardingCompleted]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'vibrant');
  }, [settings.theme]);

  const handleMonthChange = useCallback((delta) => {
    const { year, month } = getYearMonth(viewYear, viewMonth + delta);
    setViewYear(year);
    setViewMonth(month);
  }, [viewYear, viewMonth]);

  const handleSetMonthYear = useCallback((year, month) => {
    setViewYear(year);
    setViewMonth(month);
  }, []);

  useEffect(() => {
    if (settings.workType === 'w2_only' && activeTab === 'logger') {
      setActiveTab('overview');
    }
  }, [settings.workType, activeTab]);

  const handleExportBackup = () => {
    const result = exportBackupData(entriesArray, settings);
    if (result.success) {
      alert(`✓ All-Time Backup created successfully!\nExported ${result.count} total shift entries across all months & years to file.`);
    } else {
      alert(`⚠️ Backup export failed: ${result.error}`);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseBackupFile(file);

      // Restore Actual Paycheck Bank Overrides
      if (data.actualW2Paychecks && Object.keys(data.actualW2Paychecks).length > 0) {
        localStorage.setItem('gigtrack_actual_w2', JSON.stringify(data.actualW2Paychecks));
      }
      if (data.actualPaychecks && Object.keys(data.actualPaychecks).length > 0) {
        localStorage.setItem('gigtrack_actual_payouts', JSON.stringify(data.actualPaychecks));
      }

      // Restore Settings (Jobs, Gig Platforms, Rates, Themes, Profile)
      if (data.settings && Object.keys(data.settings).length > 0) {
        updateSettings({
          ...data.settings,
          actualW2Paychecks: data.actualW2Paychecks,
          actualPaychecks: data.actualPaychecks,
          onboardingCompleted: true,
        });
      } else {
        updateSettings({ onboardingCompleted: true });
      }

      // Restore All-Time Shift Entries Across All Months & Years
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        saveAllImportedEntriesToStorage(data.entries);
      }

      alert(`✓ All-Time Backup Restored Successfully!\nImported ${data.entries?.length || 0} total shift entries and full multi-job profile settings across all months.`);
      window.location.reload();
    } catch (err) {
      alert(`⚠️ Backup import failed: ${err.message}`);
    }
  };

  const handleCompleteWelcome = (profileData) => {
    updateSettings({
      ...profileData,
      onboardingCompleted: true,
    });
    setIsWelcomeOpen(false);
  };

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <div className="min-h-screen">
      <WelcomeOnboardingModal
        isOpen={isWelcomeOpen}
        onComplete={handleCompleteWelcome}
        onImportBackup={handleImportBackup}
        initialSettings={settings}
      />

      {!settings.onboardingCompleted && !isWelcomeOpen && (
        <OnboardingModal
          settings={settings}
          onComplete={updateSettings}
        />
      )}

      <Header
        monthLabel={monthLabel}
        userName={settings.userName}
        onOpenStatement={() => setIsStatementOpen(true)}
      />

      <WelcomeBanner userName={settings.userName} />

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-28 animate-fade-in">
        {activeTab === 'logger' && (
          <ShiftLogger
            key={monthKey}
            entries={entries}
            onSaveEntry={saveEntry}
            onDeleteEntry={deleteEntry}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onMonthChange={handleMonthChange}
            onSetMonthYear={handleSetMonthYear}
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
        {activeTab === 'overview' && (
          <IncomeOverview
            entriesArray={entriesArray}
            settings={settings}
            onUpdateSettings={updateSettings}
            monthLabel={monthLabel}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onSetMonthYear={handleSetMonthYear}
            onMonthChange={handleMonthChange}
            onNavigateToSettings={() => setActiveTab('settings')}
            onOpenStatement={() => setIsStatementOpen(true)}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={updateSettings}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}
      </main>

      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        entriesArray={entriesArray}
        settings={settings}
        monthLabel={monthLabel}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} settings={settings} />
    </div>
  );
}
