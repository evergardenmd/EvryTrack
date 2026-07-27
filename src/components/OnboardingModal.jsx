import React, { useState } from 'react';
import { calculateMonthlySalary } from '../hooks/useShiftStorage';

export default function OnboardingModal({ settings, onComplete }) {
  const [userName, setUserName] = useState(settings.userName || '');
  const [workType, setWorkType] = useState(settings.workType || 'both');
  const [payFrequency, setPayFrequency] = useState(settings.payFrequency || 'monthly');
  const [salaryAmount, setSalaryAmount] = useState(settings.salaryAmount ?? 1830);
  const [monthlyGoal, setMonthlyGoal] = useState(settings.monthlyGoal ?? 5000);

  const parsedAmount = parseFloat(salaryAmount) || 0;
  const computedMonthlySalary = calculateMonthlySalary(parsedAmount, payFrequency);

  const handleFinish = () => {
    const finalAmount = workType === 'gig_only' ? 0 : parsedAmount;
    const finalMonthly = workType === 'gig_only' ? 0 : computedMonthlySalary;

    onComplete({
      userName: userName.trim(),
      workType,
      payFrequency,
      salaryAmount: finalAmount,
      fixedSalary: finalMonthly,
      monthlyGoal: parseFloat(monthlyGoal) || 5000,
      onboardingCompleted: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fade-in" />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl animate-fade-in z-10 glass-card max-h-[85vh] overflow-y-auto"
        style={{
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-3"
            style={{
              background: 'color-mix(in srgb, var(--accent1) 18%, transparent)',
              border: '1.5px solid var(--accent1)',
            }}
          >
            👋
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome to EvryTrack!
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
            Let's customize the app to match your income sources.
          </p>
        </div>

        <div className="space-y-5">
          {/* Profile Name */}
          <div>
            <label className="label-text mb-1.5 block" style={{ color: 'var(--accent2)' }}>
              1. What is your name? (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="input-field text-sm py-2 px-3 font-semibold"
              placeholder="e.g. John Doe"
            />
          </div>

          {/* Step 2: Work Type */}
          <div>
            <label className="label-text mb-2.5 block" style={{ color: 'var(--accent2)' }}>
              2. What type of work do you do?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: 'W-2 + Gig', icon: '💼' },
                { id: 'gig_only', label: 'Gig Only', icon: '🚗' },
                { id: 'w2_only', label: 'W-2 Only', icon: '🏢' },
              ].map(item => {
                const active = workType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWorkType(item.id)}
                    className="p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                    style={{
                      background: active
                        ? 'color-mix(in srgb, var(--accent1) 20%, transparent)'
                        : 'color-mix(in srgb, var(--bg) 60%, transparent)',
                      borderColor: active ? 'var(--accent1)' : 'var(--card-border)',
                      boxShadow: active ? '0 0 12px color-mix(in srgb, var(--accent1) 30%, transparent)' : 'none',
                    }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: active ? 'var(--accent1)' : 'var(--text-sub)' }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Salary & Pay Frequency (if W-2 or Both) */}
          {workType !== 'gig_only' && (
            <div className="p-4 rounded-2xl space-y-3" style={{ background: 'color-mix(in srgb, var(--accent1) 6%, transparent)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <label className="label-text" style={{ color: 'var(--accent2)' }}>
                  2. W-2 Salary & Pay Frequency
                </label>
              </div>

              {/* Pay Frequency Pills */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
                {[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'biweekly', label: 'Bi-Weekly' },
                  { id: 'weekly', label: 'Weekly' },
                ].map(freq => {
                  const active = payFrequency === freq.id;
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setPayFrequency(freq.id)}
                      className="py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      style={{
                        background: active ? 'var(--btn-bg)' : 'transparent',
                        color: active ? 'var(--btn-text)' : 'var(--text-sub)',
                        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {freq.label}
                    </button>
                  );
                })}
              </div>

              {/* Salary Amount Input */}
              <div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                    $
                  </span>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={e => setSalaryAmount(e.target.value)}
                    className="input-field pl-8 font-mono font-bold"
                    placeholder="1830.00"
                    min="0"
                    step="10"
                  />
                </div>
                {parsedAmount > 0 && payFrequency !== 'monthly' && (
                  <p className="text-xs font-semibold mt-1.5 text-right font-mono" style={{ color: 'var(--accent1)' }}>
                    ≈ ${computedMonthlySalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Monthly Target Goal */}
          <div>
            <label className="label-text mb-2 block" style={{ color: 'var(--accent2)' }}>
              {workType === 'gig_only' ? '2. Monthly Income Target' : '3. Monthly Target Goal (Total)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                $
              </span>
              <input
                type="number"
                value={monthlyGoal}
                onChange={e => setMonthlyGoal(e.target.value)}
                className="input-field pl-8 font-mono font-bold"
                placeholder="5000.00"
                min="0"
                step="100"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-7 pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--card-border)' }}>
          <button
            type="button"
            onClick={() => onComplete({ onboardingCompleted: true })}
            className="text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
          >
            Use Defaults
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="btn-primary flex-1"
          >
            Start Tracking 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
