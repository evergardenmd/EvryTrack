import React, { useState } from 'react';

export default function WelcomeOnboardingModal({ isOpen, onComplete, onImportBackup, initialSettings = {} }) {
  const [step, setStep] = useState(1);
  const [setupPath, setSetupPath] = useState('new'); // 'new' | 'restore'

  // Profile & Work Classification State
  const [userName, setUserName] = useState(initialSettings.userName || '');
  const [workType, setWorkType] = useState(initialSettings.workType || 'both');
  const [payFrequency, setPayFrequency] = useState(initialSettings.payFrequency || 'monthly');
  const [salaryAmount, setSalaryAmount] = useState(initialSettings.salaryAmount ?? initialSettings.fixedSalary ?? '');
  const [paydayOfMonth, setPaydayOfMonth] = useState(initialSettings.paydayOfMonth || 1);
  const [nextPaydayDate, setNextPaydayDate] = useState(initialSettings.nextPaydayDate || new Date().toISOString().split('T')[0]);

  // Gig Platform Manager State
  const [gigPlatforms, setGigPlatforms] = useState(
    initialSettings.gigPlatforms || [
      { id: 'instacart', name: 'Instacart', icon: '🛒', active: true },
      { id: 'doordash', name: 'DoorDash', icon: '🚗', active: false },
      { id: 'uber', name: 'Uber / Uber Eats', icon: '🚕', active: false },
      { id: 'amazon_flex', name: 'Amazon Flex', icon: '📦', active: false },
      { id: 'grubhub', name: 'Grubhub', icon: '🚲', active: false },
      { id: 'lyft', name: 'Lyft', icon: '🚘', active: false },
    ]
  );
  const [customPlat, setCustomPlat] = useState('');

  const togglePlat = (id) => {
    setGigPlatforms(prev => {
      const next = prev.map(p => p.id === id ? { ...p, active: !p.active } : p);
      if (!next.some(p => p.active)) return prev;
      return next;
    });
  };

  const addCustomPlat = () => {
    if (!customPlat.trim()) return;
    setGigPlatforms(prev => [
      ...prev,
      { id: 'custom_' + Date.now(), name: customPlat.trim(), icon: '💼', active: true }
    ]);
    setCustomPlat('');
  };

  // Pay Guarantee Rate Settings (Defaults: $16.90 min wage, 120% multiplier, $0.37/mi)
  const [localMinWage, setLocalMinWage] = useState(initialSettings.localMinWage || 16.90);
  const [wageMultiplier, setWageMultiplier] = useState(initialSettings.wageMultiplier ? Math.round(initialSettings.wageMultiplier * 100) : 120);
  const [includeMiles, setIncludeMiles] = useState(initialSettings.includeMiles ?? true);
  const [mileRate, setMileRate] = useState(initialSettings.mileRate || 0.37);

  // Monthly Target & Sync Preferences
  const [monthlyTarget, setMonthlyTarget] = useState(initialSettings.monthlyTarget || 3500);
  const [syncPreference, setSyncPreference] = useState(initialSettings.syncPreference || 'local');

  // Interactive Live Demo Calculator State
  const [demoHours, setDemoHours] = useState(2.5);
  const [demoMiles, setDemoMiles] = useState(12.0);
  const [demoBase, setDemoBase] = useState(28.00);
  const [demoTips, setDemoTips] = useState(18.50);
  const [demoBump, setDemoBump] = useState(0.00);

  if (!isOpen) return null;

  // Live Demo Detailed Formula Calculations
  const activeMinWage = Number(localMinWage) || 16.90;
  const activeMult = (Number(wageMultiplier) || 120) / 100;
  const activeMileRate = Number(mileRate) || 0.37;

  const hourlyRateGuarantee = activeMinWage * activeMult; // $16.90 * 1.20 = $20.28/hr
  const hourlyGuaranteeTotal = Math.round((demoHours * hourlyRateGuarantee) * 100) / 100;
  const mileageGuaranteeTotal = includeMiles ? Math.round((demoMiles * activeMileRate) * 100) / 100 : 0;

  const demoFloor = Math.round((hourlyGuaranteeTotal + mileageGuaranteeTotal) * 100) / 100;
  const demoTopUp = Math.round(Math.max(0, demoFloor - demoBase) * 100) / 100;
  const demoGuaranteedPay = Math.round((demoBase + demoTopUp) * 100) / 100;
  const demoTotal = Math.round((demoGuaranteedPay + demoTips + demoBump) * 100) / 100;

  const handleFinish = () => {
    onComplete({
      userName: userName.trim(),
      workType,
      payFrequency,
      salaryAmount: Number(salaryAmount) || 0,
      paydayOfMonth: Number(paydayOfMonth) || 1,
      nextPaydayDate: nextPaydayDate || new Date().toISOString().split('T')[0],
      gigPlatforms,
      localMinWage: Number(activeMinWage) || 16.90,
      wageMultiplier: Number(activeMult) || 1.2,
      includeMiles,
      mileRate: Number(activeMileRate) || 0.37,
      monthlyTarget: Number(monthlyTarget) || 3500,
      syncPreference,
      onboardingCompleted: true,
      onboardedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        {/* Header Banner */}
        <div className="p-4 sm:p-5 text-center border-b shrink-0" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
          <div className="w-10 h-10 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold mb-2 shadow-lg" style={{ background: 'var(--accent1)', color: 'var(--btn-text)' }}>
            📊
          </div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome to EvryTrack
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
            Interactive App Guide & Profile Setup ({step}/4)
          </p>

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: step === s ? '24px' : '8px',
                  background: step === s ? 'var(--accent1)' : 'var(--card-border)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[64vh]">
          {/* STEP 1: WELCOME & SETUP PATH SELECTION */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="space-y-1.5">
                <h3 className="text-base font-bold" style={{ color: 'var(--accent1)' }}>
                  Automated Income & Pay Floor Ledger
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                  Welcome! Are you setting up EvryTrack for the first time, or transferring your data from another device?
                </p>
              </div>

              {/* Setup Path Selection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-1">
                <button
                  type="button"
                  onClick={() => setSetupPath('new')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    setupPath === 'new'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md font-bold'
                      : 'bg-slate-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🚀</span>
                    <h4 className="font-extrabold text-xs text-white">New User Setup</h4>
                  </div>
                  <p className="text-[10px] font-normal text-gray-400 leading-normal">
                    Guided setup: profile, active gig apps (Instacart, DoorDash, Uber), W-2 jobs, & pay floor rules.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSetupPath('restore')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    setupPath === 'restore'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md font-bold'
                      : 'bg-slate-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📱</span>
                    <h4 className="font-extrabold text-xs text-white">Transfer / Restore Data</h4>
                  </div>
                  <p className="text-[10px] font-normal text-gray-400 leading-normal">
                    Restoring from another device? Import a .json backup file or connect via Direct Wi-Fi WebRTC Sync.
                  </p>
                </button>
              </div>

              {/* RESTORE PATH CONTENT */}
              {setupPath === 'restore' && (
                <div className="p-4 rounded-2xl border space-y-3 text-left animate-fade-in bg-blue-500/10 border-blue-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <h4 className="font-bold text-xs text-blue-300">Data Restore & Device Transfer Options</h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Option A: Import Backup File */}
                    <div className="p-3 rounded-xl border bg-slate-900/80 border-gray-800 space-y-2">
                      <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <span>📁 Option 1: Import Backup File (.json)</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Upload a previously exported <code>EvryTrack_Backup.json</code> file to restore all your shift entries and settings.
                      </p>
                      <label className="px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-500 text-white cursor-pointer shadow-md inline-block hover:bg-blue-400">
                        <span>Choose Backup File</span>
                        <input
                          type="file"
                          accept=".json,.evrytrack,application/json,text/plain,*"
                          onChange={e => {
                            if (onImportBackup) onImportBackup(e);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Option B: Wi-Fi Direct WebRTC Sync */}
                    <div className="p-3 rounded-xl border bg-slate-900/80 border-gray-800 space-y-1.5">
                      <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <span>⚡️ Option 2: Wi-Fi Direct WebRTC Sync</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Sync directly over your local network between your iPhone PWA and Desktop PC using WebRTC Pairing ID / QR Code.
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold">
                        Tip: Complete setup and open Settings → Direct Local Network WebRTC Sync to connect devices!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW USER FEATURE SHOWCASE GRID */}
              {setupPath === 'new' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2 text-left pt-1">
                    <div className="p-3 rounded-2xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <span className="text-base">🛒</span>
                      <p className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>Multi-Gig App Engine</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Instacart, DoorDash, Uber, Amazon Flex</p>
                    </div>
                    <div className="p-3 rounded-2xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <span className="text-base">🏢</span>
                      <p className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>Multi-W-2 Employer</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Single/dual jobs & start date scope</p>
                    </div>
                    <div className="p-3 rounded-2xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <span className="text-base">⚡️</span>
                      <p className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>Pay Floor & Top-Up</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Independent per-app guarantee math</p>
                    </div>
                    <div className="p-3 rounded-2xl border" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <span className="text-base">📄</span>
                      <p className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>Official PDF Statements</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Monthly & 12-month Annual Tax Rollups</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border flex items-center gap-2.5 text-left text-xs" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                    <span className="text-lg">🔒</span>
                    <div>
                      <p className="font-bold text-emerald-400">100% Local-First Privacy</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>
                        Your shift data stays private on your phone, Zorin OS, Mac, or PC. Works offline with zero server requirement.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: INTERACTIVE TERMINOLOGY & FORMULA GUIDE */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent1)' }}>
                  Step 2: Key Terminology & Formula Guide
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                  Understand how your pay components and local floor guarantees are structured.
                </p>
              </div>

              {/* Equation Banner */}
              <div className="p-3 rounded-2xl border text-center font-mono text-xs font-bold space-y-1" style={{ background: 'var(--drum-bg)', borderColor: 'var(--accent1)' }}>
                <p className="text-[10px] uppercase tracking-wider font-sans text-emerald-400">Universal Shift Earnings Formula</p>
                <p style={{ color: 'var(--text-primary)' }}>
                  Total Pay = (Base Pay) + (Top-Up) + Tips + Bumps
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {/* Term 1: Base Pay */}
                <div className="p-3 rounded-2xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>(Base Pay)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--drum-bg)', color: 'var(--text-sub)' }}>Gig App Direct Pay</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                    The initial batch/order pay paid directly by Instacart, DoorDash, or Uber for your active shift time.
                  </p>
                </div>

                {/* Term 2: Top-Up */}
                <div className="p-3 rounded-2xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-400">(Top-Up)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-400">Local Pay Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                    Extra pay added by local minimum wage laws (California Prop 22, Seattle Pay Ordinance, NYC) when (Base Pay) falls below the Guaranteed Pay floor.
                  </p>
                </div>

                {/* Term 3: Tips */}
                <div className="p-3 rounded-2xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-400">Tips</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-400">100% Yours</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                    Customer tips are added directly on top of your pay floor and are never reduced by Top-Up adjustments.
                  </p>
                </div>

                {/* Term 4: Bumps */}
                <div className="p-3 rounded-2xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs" style={{ color: 'var(--accent1)' }}>Bumps</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--drum-bg)', color: 'var(--text-sub)' }}>Incident Pay</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                    Shopper bumps, wait time compensation, or heavy order fees added outside Top-Up adjustments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ULTRA-DETAILED INTERACTIVE LIVE DEMO CALCULATOR */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent1)' }}>
                  Step 3: Live Interactive Guarantee Demo
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                  Adjust shift numbers below to watch (Base Pay), (Top-Up), & Total Pay calculate step-by-step!
                </p>
              </div>

              {/* Interactive Test Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Active Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={demoHours}
                    onChange={(e) => setDemoHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Miles Driven</label>
                  <input
                    type="number"
                    step="0.5"
                    value={demoMiles}
                    onChange={(e) => setDemoMiles(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-400">(Base Pay)</label>
                  <input
                    type="number"
                    step="1"
                    value={demoBase}
                    onChange={(e) => setDemoBase(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Tips ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={demoTips}
                    onChange={(e) => setDemoTips(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Bumps ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={demoBump}
                    onChange={(e) => setDemoBump(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Detailed Math Breakdown Cards */}
              <div className="p-4 rounded-2xl border space-y-3 text-xs" style={{ background: 'var(--drum-bg)', borderColor: 'var(--accent1)' }}>
                <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">
                  Step-by-Step Guarantee Math Breakdown
                </p>

                {/* Step A: Hourly Floor */}
                <div className="p-2.5 rounded-xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>
                      Step A: Hourly Floor Calculation
                    </span>
                    <span className="font-bold text-sm" style={{ color: 'var(--accent1)' }}>${hourlyGuaranteeTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-sub)' }}>
                    {demoHours}h × (${activeMinWage.toFixed(2)} min wage × {wageMultiplier}% mult = ${hourlyRateGuarantee.toFixed(2)}/hr)
                  </p>
                </div>

                {/* Step B: Mileage Floor */}
                {includeMiles && (
                  <div className="p-2.5 rounded-xl border space-y-1" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>
                        Step B: Mileage Floor Calculation
                      </span>
                      <span className="font-bold text-sm" style={{ color: 'var(--accent1)' }}>+${mileageGuaranteeTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-sub)' }}>
                      {demoMiles}mi × ${activeMileRate.toFixed(2)} per mile
                    </p>
                  </div>
                )}

                {/* Step C: Guaranteed Pay Floor */}
                <div className="p-2.5 rounded-xl border space-y-1" style={{ background: 'color-mix(in srgb, var(--accent1) 12%, transparent)', borderColor: 'var(--accent1)' }}>
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>
                      Step C: Guaranteed Pay Floor Total
                    </span>
                    <span className="font-extrabold text-sm" style={{ color: 'var(--accent1)' }}>${demoFloor.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>
                    Minimum earnings threshold required by local law.
                  </p>
                </div>

                {/* Step D: Calculated Top-Up */}
                <div className="p-2.5 rounded-xl border space-y-1 bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[11px] text-amber-400">
                      Step D: Calculated (Top-Up) Adjustment
                    </span>
                    <span className="font-extrabold text-sm text-amber-400">
                      {demoTopUp > 0 ? `(+$${demoTopUp.toFixed(2)})` : '($0.00)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-300/80">
                    {demoTopUp > 0
                      ? `Floor ($${demoFloor.toFixed(2)}) - (Base Pay $${demoBase.toFixed(2)}) = Top-Up of $${demoTopUp.toFixed(2)}.`
                      : `(Base Pay $${demoBase.toFixed(2)}) met or exceeded Floor ($${demoFloor.toFixed(2)}).`}
                  </p>
                </div>

                {/* Step E: Base Pay + Top-Up Guaranteed Result */}
                <div className="p-2.5 rounded-xl border space-y-1 bg-emerald-500/10 border-emerald-500/30">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[11px] text-emerald-400">
                      Step E: Guaranteed Pay Result
                    </span>
                    <span className="font-extrabold text-sm text-emerald-400">
                      ${demoGuaranteedPay.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-300/80">
                    (Base Pay ${demoBase.toFixed(2)}) + (Top-Up ${demoTopUp.toFixed(2)}) = Guaranteed Pay of ${demoGuaranteedPay.toFixed(2)}. Tips (${demoTips.toFixed(2)}) & Bumps (${demoBump.toFixed(2)}) are added on top!
                  </p>
                </div>

                {/* Final Shift Pay */}
                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <div>
                    <span className="font-extrabold text-xs block" style={{ color: 'var(--text-primary)' }}>Total Shift Earnings:</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-sub)' }}>
                      Base Pay (${demoBase.toFixed(2)}) + Top-Up (${demoTopUp.toFixed(2)}) + Tips (${demoTips.toFixed(2)}){demoBump > 0 ? ` + Bump ($${demoBump.toFixed(2)})` : ''}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-lg text-emerald-400">${demoTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADAPTIVE PROFILE, RATES, & SYNC SETUP */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent1)' }}>
                  Step 4: Profile, Pay Rates & Sync Setup
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                  Configure your profile, local pay floor rules, and multi-device sync preference.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-sub)' }}>
                  Profile Name / Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Justin M."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
                  style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Work Type Selection */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-sub)' }}>
                  Work Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkType('both')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${workType === 'both' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: workType !== 'both' ? 'var(--header-bg)' : undefined, borderColor: workType !== 'both' ? 'var(--card-border)' : undefined, color: workType !== 'both' ? 'var(--text-sub)' : undefined }}
                  >
                    💼 W-2 & Gig
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkType('gig_only')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${workType === 'gig_only' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: workType !== 'gig_only' ? 'var(--header-bg)' : undefined, borderColor: workType !== 'gig_only' ? 'var(--card-border)' : undefined, color: workType !== 'gig_only' ? 'var(--text-sub)' : undefined }}
                  >
                    🚗 Gig Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkType('w2_only')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${workType === 'w2_only' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: workType !== 'w2_only' ? 'var(--header-bg)' : undefined, borderColor: workType !== 'w2_only' ? 'var(--card-border)' : undefined, color: workType !== 'w2_only' ? 'var(--text-sub)' : undefined }}
                  >
                    🏢 W-2 Only
                  </button>
                </div>
              </div>

              {/* Gig App Selection (Visible for 'both' or 'gig_only') */}
              {workType !== 'w2_only' && (
                <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: 'color-mix(in srgb, var(--accent1) 6%, transparent)', borderColor: 'var(--card-border)' }}>
                  <label className="block text-xs font-bold" style={{ color: 'var(--accent2)' }}>
                    Which Gig Apps Do You Work?
                  </label>
                  <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>
                    Select your active apps. Only your selected apps will show up in your Shift Logger.
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {gigPlatforms.map(plat => (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => togglePlat(plat.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                          plat.active
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900/60 border-gray-800 text-gray-400 opacity-60'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{plat.icon}</span>
                          <span>{plat.name}</span>
                        </span>
                        <span>{plat.active ? '✓' : '+'}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add Custom App (e.g. Spark, Shipt)"
                      value={customPlat}
                      onChange={e => setCustomPlat(e.target.value)}
                      className="input-field text-xs py-1.5 px-3 flex-1"
                    />
                    <button
                      type="button"
                      onClick={addCustomPlat}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 text-black cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* W-2 Income Fields (Visible for 'both' or 'w2_only') */}
              {workType !== 'gig_only' && (
                <div className="p-3.5 rounded-2xl border space-y-3" style={{ background: 'color-mix(in srgb, var(--accent1) 8%, transparent)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--accent2)' }}>
                      W-2 Income & Pay Frequency
                    </span>
                  </div>

                  {/* Pay Frequency Pills */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'var(--header-bg)' }}>
                    {[
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'biweekly', label: 'Bi-Weekly' },
                      { id: 'weekly', label: 'Weekly' },
                    ].map(freq => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setPayFrequency(freq.id)}
                        className={`py-1 rounded-lg text-xs font-bold transition-all text-center ${payFrequency === freq.id ? 'bg-emerald-500 text-black' : ''}`}
                        style={{ color: payFrequency !== freq.id ? 'var(--text-sub)' : undefined }}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>

                  {/* Payday Date Inputs */}
                  {payFrequency === 'monthly' && (
                    <div>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                        Day of Month for Paycheck
                      </label>
                      <select
                        value={paydayOfMonth}
                        onChange={e => setPaydayOfMonth(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold"
                        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day === 1 ? '1st of the month' : day === 15 ? '15th of the month' : day === 31 ? 'Last day of month (31st / 28th Feb)' : `${day}th of the month`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(payFrequency === 'biweekly' || payFrequency === 'weekly') && (
                    <div>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                        Next Expected Paycheck Date
                      </label>
                      <input
                        type="date"
                        value={nextPaydayDate}
                        onChange={(e) => setNextPaydayDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold"
                        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}

                  {/* Salary Amount */}
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                      Paycheck Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="1830.00"
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold"
                      style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {/* Gig Pay Floor Guarantee Rates (Visible for 'both' or 'gig_only') */}
              {workType !== 'w2_only' && (
                <div className="p-3.5 rounded-2xl border space-y-3" style={{ background: 'color-mix(in srgb, var(--accent1) 8%, transparent)', borderColor: 'var(--card-border)' }}>
                  <span className="text-xs font-bold block" style={{ color: 'var(--accent2)' }}>
                    Local Pay Floor Guarantee Parameters
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                        Local Min Wage ($/hr)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={localMinWage}
                        onChange={(e) => setLocalMinWage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold"
                        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                        Wage Multiplier (%)
                      </label>
                      <input
                        type="number"
                        step="5"
                        value={wageMultiplier}
                        onChange={(e) => setWageMultiplier(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold"
                        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {/* Driving Mileage Toggle & Rate */}
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Track Driving Mileage</span>
                      <button
                        type="button"
                        onClick={() => setIncludeMiles(!includeMiles)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${includeMiles ? 'bg-emerald-500 text-black border-emerald-500' : ''}`}
                        style={{ background: !includeMiles ? 'var(--header-bg)' : undefined, borderColor: !includeMiles ? 'var(--card-border)' : undefined, color: !includeMiles ? 'var(--text-sub)' : undefined }}
                      >
                        {includeMiles ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {includeMiles && (
                      <div className="text-xs">
                        <label className="block font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>
                          Per-Mile Guarantee Rate ($/mi)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={mileRate}
                          onChange={(e) => setMileRate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold"
                          style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Goal Target */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-sub)' }}>
                  Monthly Income Target Goal ($)
                </label>
                <input
                  type="number"
                  placeholder="3500"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-none transition-all"
                  style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Multi-Device Sync Preference */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-sub)' }}>
                  Data Backup & Sync Preference
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSyncPreference('local')}
                    className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center ${syncPreference === 'local' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: syncPreference !== 'local' ? 'var(--header-bg)' : undefined, borderColor: syncPreference !== 'local' ? 'var(--card-border)' : undefined, color: syncPreference !== 'local' ? 'var(--text-sub)' : undefined }}
                  >
                    🛡️ 1-Click File (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncPreference('wifi')}
                    className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center ${syncPreference === 'wifi' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: syncPreference !== 'wifi' ? 'var(--header-bg)' : undefined, borderColor: syncPreference !== 'wifi' ? 'var(--card-border)' : undefined, color: syncPreference !== 'wifi' ? 'var(--text-sub)' : undefined }}
                  >
                    📶 Home Wi-Fi (Soon)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncPreference('cloud')}
                    className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center ${syncPreference === 'cloud' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ background: syncPreference !== 'cloud' ? 'var(--header-bg)' : undefined, borderColor: syncPreference !== 'cloud' ? 'var(--card-border)' : undefined, color: syncPreference !== 'cloud' ? 'var(--text-sub)' : undefined }}
                  >
                    ☁️ Cloud Drive (Soon)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t flex items-center justify-between gap-3 shrink-0" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer"
              style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}
            >
              ← Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="ml-auto px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'var(--accent1)', color: 'var(--btn-text)' }}
            >
              Next Step ➔
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="ml-auto px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'var(--accent1)', color: 'var(--btn-text)' }}
            >
              Launch EvryTrack Beta 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
