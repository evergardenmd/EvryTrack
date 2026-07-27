import React, { useState, useEffect } from 'react';
import { calculateMonthlySalary, DEFAULT_GIG_PLATFORMS } from '../hooks/useShiftStorage';
import { startPeerHost, connectToPeerHost, stopPeerSync } from '../utils/webrtcSync';
import ShowSyncQRCode from './ShowSyncQRCode';
import ScanDesktopQR from './ScanDesktopQR';
import { createDefaultJob } from '../utils/jobManagerEngine';

export default function SettingsView({ settings, onUpdateSettings, onExportBackup, onImportBackup }) {
  const [local, setLocal] = useState(settings);
  const [savedMessage, setSavedMessage] = useState(false);

  // W-2 Multi-Job Manager States
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  // Job Re-Activation Prompt Modal States
  const [reactivateModalJob, setReactivateModalJob] = useState(null);
  const [reactivateDetails, setReactivateDetails] = useState({
    payFrequency: 'monthly',
    paycheckAmount: '',
    nextPaydayDate: new Date().toISOString().split('T')[0],
    paydayOfMonth: 1,
  });

  // Gig Platform Manager State
  const [customPlatName, setCustomPlatName] = useState('');

  const handleTogglePlatform = (platId) => {
    const currentPlats = local.gigPlatforms || DEFAULT_GIG_PLATFORMS;
    const updated = currentPlats.map(p => p.id === platId ? { ...p, active: !p.active } : p);

    if (!updated.some(p => p.active)) {
      return;
    }

    const updatedLocal = { ...local, gigPlatforms: updated };
    setLocal(updatedLocal);
    onUpdateSettings({ gigPlatforms: updated });
  };

  const handleAddCustomPlatform = () => {
    if (!customPlatName.trim()) return;
    const currentPlats = local.gigPlatforms || DEFAULT_GIG_PLATFORMS;
    const newId = 'custom_' + Date.now();
    const newPlat = {
      id: newId,
      name: customPlatName.trim(),
      icon: '💼',
      active: true,
    };
    const updated = [...currentPlats, newPlat];
    const updatedLocal = { ...local, gigPlatforms: updated };
    setLocal(updatedLocal);
    onUpdateSettings({ gigPlatforms: updated });
    setCustomPlatName('');
  };

  // WebRTC P2P Direct Local Network Sync States
  const [p2pModalOpen, setP2pModalOpen] = useState(false);
  const [p2pRole, setP2pRole] = useState(null); // 'host' | 'client' | null
  const [hostPairId, setHostPairId] = useState('');
  const [targetPairId, setTargetPairId] = useState('');
  const [p2pStatus, setP2pStatus] = useState('');
  const [p2pStats, setP2pStats] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  // Clean up WebRTC peer on unmount or modal close
  useEffect(() => {
    return () => {
      stopPeerSync();
    };
  }, []);

  const handleStartHost = async () => {
    setP2pRole('host');
    setP2pStatus('Initializing WebRTC P2P Host Node...');
    setIsConnecting(true);

    await startPeerHost(
      (pairId) => {
        setHostPairId(pairId);
        setIsConnecting(false);
        setP2pStatus('🟢 WebRTC Host Active. Scan QR Code or enter Pairing ID on iPhone PWA to sync.');
      },
      ({ mergedList, stats }) => {
        setP2pStats(stats);
        setP2pStatus(`✓ Direct WebRTC Sync Received! CRDT merged ${stats.newFromRemote} new and ${stats.updatedFromRemote} updated shifts.`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      (errorMsg) => {
        setIsConnecting(false);
        setP2pStatus(`⚠️ P2P Connection Error: ${errorMsg}`);
      }
    );
  };

  const handleStartClientSync = async () => {
    if (!targetPairId.trim()) {
      setP2pStatus('⚠️ Please enter the Desktop Host Pairing ID or scan QR code.');
      return;
    }

    setIsConnecting(true);
    setP2pStatus('Establishing direct WebRTC DataChannel connection...');

    await connectToPeerHost(
      targetPairId.trim(),
      (response) => {
        setIsConnecting(false);
        setP2pStats(response.stats);
        setP2pStatus('✓ Direct WebRTC Sync Complete! Shifts merged with Desktop App via CRDT.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      (errorMsg) => {
        setIsConnecting(false);
        setP2pStatus(`⚠️ Sync failed: ${errorMsg}`);
      }
    );
  };

  const handleCloseP2pModal = () => {
    stopPeerSync();
    setP2pModalOpen(false);
    setP2pRole(null);
    setHostPairId('');
    setTargetPairId('');
    setP2pStatus('');
    setP2pStats(null);
    setIsConnecting(false);
  };

  // Job Management Handlers
  const jobsList = Array.isArray(local.jobs) ? local.jobs : [];

  const handleOpenAddJob = () => {
    setEditingJob(createDefaultJob({ title: 'New W-2 Employer' }));
    setJobModalOpen(true);
  };

  const handleOpenEditJob = (job) => {
    setEditingJob({ ...job });
    setJobModalOpen(true);
  };

  const handleSaveJobModal = (formData) => {
    const existingJobs = [...jobsList];
    const idx = existingJobs.findIndex(j => j.id === formData.id);
    if (idx >= 0) {
      existingJobs[idx] = { ...formData };
    } else {
      existingJobs.push(formData);
    }

    const primaryJob = existingJobs.find(j => j.status === 'active') || existingJobs[0] || formData;
    const newSalary = parseFloat(primaryJob.paycheckAmount) || 0;
    const newFreq = primaryJob.payFrequency || 'monthly';

    const updatedLocal = {
      ...local,
      jobs: existingJobs,
      salaryAmount: newSalary,
      payFrequency: newFreq,
    };

    setLocal(updatedLocal);
    onUpdateSettings(updatedLocal);

    setJobModalOpen(false);
    setEditingJob(null);
  };

  const handleToggleJobStatus = (jobId) => {
    const existingJobs = local.jobs || jobsList;
    const targetJob = existingJobs.find(j => j.id === jobId);

    if (targetJob && targetJob.status === 'deactivated') {
      setReactivateModalJob(targetJob);
      setReactivateDetails({
        payFrequency: targetJob.payFrequency || 'monthly',
        paycheckAmount: targetJob.paycheckAmount || '',
        nextPaydayDate: targetJob.nextPaydayDate || new Date().toISOString().split('T')[0],
        paydayOfMonth: targetJob.paydayOfMonth || 1,
      });
      return;
    }

    const updatedJobs = existingJobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          status: 'deactivated',
          endDate: new Date().toISOString().split('T')[0],
        };
      }
      return j;
    });

    const updatedLocal = { ...local, jobs: updatedJobs };
    setLocal(updatedLocal);
    onUpdateSettings({ jobs: updatedJobs });
  };

  const handleConfirmReactivation = (keepSame) => {
    if (!reactivateModalJob) return;

    const updatedJobs = (local.jobs || jobsList).map(j => {
      if (j.id === reactivateModalJob.id) {
        return {
          ...j,
          status: 'active',
          endDate: null,
          payFrequency: keepSame ? j.payFrequency : reactivateDetails.payFrequency,
          paycheckAmount: keepSame ? (parseFloat(j.paycheckAmount) || 0) : (parseFloat(reactivateDetails.paycheckAmount) || j.paycheckAmount),
          nextPaydayDate: keepSame ? j.nextPaydayDate : reactivateDetails.nextPaydayDate,
          paydayOfMonth: keepSame ? j.paydayOfMonth : reactivateDetails.paydayOfMonth,
        };
      }
      return j;
    });

    const updatedLocal = { ...local, jobs: updatedJobs };
    setLocal(updatedLocal);
    onUpdateSettings({ jobs: updatedJobs });

    setReactivateModalJob(null);
  };

  const handleOpenDeleteJob = (job) => {
    setJobToDelete(job);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteJob = (option) => {
    if (!jobToDelete) return;

    if (option === 'deactivate') {
      handleToggleJobStatus(jobToDelete.id);
    } else if (option === 'delete_retain_history' || option === 'hard_delete') {
      const filteredJobs = (local.jobs || jobsList).filter(j => j.id !== jobToDelete.id);
      const updatedLocal = { ...local, jobs: filteredJobs };
      setLocal(updatedLocal);
      onUpdateSettings({ jobs: filteredJobs });
    }

    setDeleteModalOpen(false);
    setJobToDelete(null);
  };

  const currentWorkType = local.workType || 'both';
  const currentFreq = local.payFrequency || 'monthly';
  const currentAmt = parseFloat(local.salaryAmount ?? local.fixedSalary) || 0;
  const liveMonthly = calculateMonthlySalary(currentAmt, currentFreq);

  const handleSave = () => {
    const rawAmt = parseFloat(local.salaryAmount) ?? parseFloat(local.fixedSalary) ?? 0;
    const freq = local.payFrequency || 'monthly';
    const computedMonthly = calculateMonthlySalary(rawAmt, freq);

    onUpdateSettings({
      ...local,
      jobs: local.jobs || jobsList,
      userName: local.userName || '',
      workType: local.workType || 'both',
      payFrequency: freq,
      salaryAmount: rawAmt,
      fixedSalary: local.workType === 'gig_only' ? 0 : computedMonthly,
      monthlyGoal: parseFloat(local.monthlyGoal) || 5000,
      localMinWage: parseFloat(local.localMinWage) || 16.90,
      wageMultiplier: local.wageMultiplier ? parseFloat(local.wageMultiplier) : 1.20,
      includeMiles: !!local.includeMiles,
      mileRate: parseFloat(local.mileRate) || 0.37,
      theme: local.theme || 'vibrant',
    });

    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleReRunOnboarding = () => {
    onUpdateSettings({ onboardingCompleted: false });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            App Settings
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
            Manage your driver profile, pay floor parameters, theme palette, and WebRTC P2P sync.
          </p>
        </div>
      </div>

      {/* 1. Driver Profile & Work Classification */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
          1. Profile & Work Classification
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-sub)' }}>
              Display Name / Driver Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex R."
              value={local.userName || ''}
              onChange={e => setLocal(p => ({ ...p, userName: e.target.value }))}
              className="input-field text-sm py-2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-sub)' }}>
              Work Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: '💼 W-2 & Gig', sub: 'Hybrid' },
                { id: 'gig_only', label: '🚗 Gig Only', sub: '1099 Shifts' },
                { id: 'w2_only', label: '🏢 W-2 Only', sub: 'Fixed Paycheck' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLocal(p => ({ ...p, workType: item.id }))}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    currentWorkType === item.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : ''
                  }`}
                  style={{
                    background: currentWorkType !== item.id ? 'var(--header-bg)' : undefined,
                    borderColor: currentWorkType !== item.id ? 'var(--card-border)' : undefined,
                    color: currentWorkType !== item.id ? 'var(--text-sub)' : undefined,
                  }}
                >
                  <div>{item.label}</div>
                  <div className="text-[10px] font-normal opacity-70 mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* W-2 Multi-Job Manager Card */}
      {currentWorkType !== 'gig_only' && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
                W-2 Employer & Paycheck Profiles
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                Manage single or dual W-2 jobs, pay schedules, and active/deactivated statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddJob}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-md flex items-center gap-1"
            >
              <span>➕ Add Job</span>
            </button>
          </div>

          {jobsList.length === 0 ? (
            <div className="p-6 rounded-2xl border text-center space-y-3" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--card-border)' }}>
              <div className="text-3xl">🏢</div>
              <div>
                <h4 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>No W-2 Employer Profiles Configured</h4>
                <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
                  You currently have no active or saved W-2 jobs. Click <strong>+ Add Job</strong> to set up your paycheck schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddJob}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-lg inline-flex items-center gap-1.5"
              >
                <span>➕ Add W-2 Employer Profile</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobsList.map(job => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl border transition-all"
                  style={{
                    background: job.status === 'active' ? 'color-mix(in srgb, var(--accent1) 12%, transparent)' : 'color-mix(in srgb, var(--bg) 60%, transparent)',
                    borderColor: job.status === 'active' ? 'color-mix(in srgb, var(--accent1) 40%, transparent)' : 'var(--card-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{job.status === 'active' ? '🏢' : '⏸'}</span>
                      <div>
                        <h4 className="font-extrabold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <span>{job.title}</span>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                            job.status === 'active' ? 'bg-emerald-500 text-black shadow-sm' : 'bg-gray-700 text-gray-200'
                          }`}>
                            {job.status === 'active' ? 'Active 🟢' : 'Deactivated ⏸'}
                          </span>
                        </h4>
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-sub)' }}>
                          Schedule: <span className="font-bold capitalize" style={{ color: 'var(--accent1)' }}>{job.payFrequency}</span> • Expected Check: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>${parseFloat(job.paycheckAmount).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active / Deactivated Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleJobStatus(job.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-sm ${
                          job.status === 'active'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                        }`}
                      >
                        {job.status === 'active' ? 'Pause / Deactivate' : 'Re-Activate 🟢'}
                      </button>

                      {/* Edit Job Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditJob(job)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-sm"
                        style={{
                          background: 'color-mix(in srgb, var(--header-bg) 80%, transparent)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--card-border)'
                        }}
                      >
                        ✏️ Edit
                      </button>

                      {/* Delete Job Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteJob(job)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/25 cursor-pointer shadow-sm"
                        title="Delete options"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Gig Platforms Manager Card (Hidden if W-2 Only) */}
      {currentWorkType !== 'w2_only' && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <div>
            <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
              Active Gig Platforms
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-sub)' }}>
              Select the specific gig apps you work. Only your selected apps will appear as tabs when logging daily shifts.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(local.gigPlatforms || DEFAULT_GIG_PLATFORMS).map(plat => (
              <button
                key={plat.id}
                type="button"
                onClick={() => handleTogglePlatform(plat.id)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                  plat.active
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold shadow-md'
                    : 'bg-slate-900/60 border-gray-800 text-gray-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plat.icon}</span>
                  <span className="text-xs">{plat.name}</span>
                </div>
                <span className="text-xs">{plat.active ? '✓' : '+'}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Add Custom Gig App (e.g. Spark, Shipt)"
              value={customPlatName}
              onChange={e => setCustomPlatName(e.target.value)}
              className="input-field text-xs py-1.5 px-3 flex-1"
            />
            <button
              type="button"
              onClick={handleAddCustomPlatform}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 text-black cursor-pointer shadow-md hover:bg-emerald-400"
            >
              + Add
            </button>
          </div>
        </div>
      )}

      {/* 2. Pay Floor Guarantee Rates (Hidden if W-2 Only) */}
      {currentWorkType !== 'w2_only' && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
            2. Local Pay Guarantee Floor Rates
          </h3>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            Configures minimum guaranteed pay floor rules (e.g. California Prop 22, Seattle Pay Ordinance, NYC Minimum Pay).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-sub)' }}>
                Local Min Wage ($/hr)
              </label>
              <input
                type="number"
                value={local.localMinWage || 16.90}
                onChange={e => setLocal(p => ({ ...p, localMinWage: e.target.value }))}
                className="input-field text-sm py-2 font-mono"
                step="0.25"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-sub)' }}>
                Wage Multiplier (%)
              </label>
              <input
                type="number"
                value={local.wageMultiplier ? Math.round(local.wageMultiplier * 100) : 120}
                onChange={e => setLocal(p => ({ ...p, wageMultiplier: parseFloat(e.target.value) / 100 }))}
                className="input-field text-sm py-2 font-mono"
                step="5"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Themes */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
          {currentWorkType !== 'w2_only' ? '3. Visual Theme Palette' : '2. Visual Theme Palette'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            { id: 'vibrant', name: 'Terracotta Dark', icon: '🔴', c1: '#EDCC8B', c2: '#171314' },
            { id: 'vibrant-light', name: 'Terracotta Light', icon: '🌸', c1: '#A26360', c2: '#F8F0E9' },
            { id: 'emerald', name: 'Forest Dark', icon: '🌲', c1: '#34D399', c2: '#070F0B' },
            { id: 'emerald-light', name: 'Forest Light', icon: '🍃', c1: '#059669', c2: '#F0FAF5' },
            { id: 'cyan', name: 'Cyan Dark', icon: '⚡', c1: '#38BDF8', c2: '#060B14' },
            { id: 'cyan-light', name: 'Cyan Light', icon: '🔵', c1: '#0284C7', c2: '#EFF8FF' },
          ].map(t => {
            const active = (local.theme || 'vibrant') === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setLocal(p => ({ ...p, theme: t.id }))}
                className="p-2.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer"
                style={{
                  background: active ? 'color-mix(in srgb, var(--accent1) 20%, transparent)' : 'color-mix(in srgb, var(--bg) 60%, transparent)',
                  borderColor: active ? t.c1 : 'var(--card-border)',
                  boxShadow: active ? `0 0 10px ${t.c1}66` : 'none',
                }}
              >
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: active ? 'var(--text-primary)' : 'var(--text-sub)' }}>
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

      {/* 4. Data Management & P2P WebRTC Direct Sync */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="label-text" style={{ color: 'var(--accent2)' }}>
          {currentWorkType !== 'w2_only' ? '4. Data Backup & Cross-Device Sync' : '3. Data Backup & Cross-Device Sync'}
        </h3>

        <div className="space-y-3">
          {/* File Backup & Restore */}
          <div className="p-3.5 rounded-2xl border space-y-2" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--card-border)' }}>
            <div>
              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>1-Click All-Time Backup & Restore</p>
              <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>Export or import an encrypted .evrytrack data file ($0 Cost, 100% Offline)</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ background: 'color-mix(in srgb, var(--accent1) 15%, transparent)', borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
              >
                📥 Export All-Time Backup (.json)
              </button>

              <label className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
                📤 Import Backup File
                <input
                  type="file"
                  accept=".json,.evrytrack,application/json,text/plain,*"
                  onChange={onImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* WebRTC P2P Direct Local Network Sync */}
          <div className="p-3.5 rounded-2xl border space-y-3" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>📶 WebRTC P2P Direct Local Network Sync</p>
                <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>Direct device-to-device WebRTC sync with zero cloud server data storage & CRDT conflict merging</p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PeerJS WebRTC
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setP2pModalOpen(true); handleStartHost(); }}
                className="p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-emerald-400">💻 Host Pairing (Desktop Receiver)</span>
                  <span className="text-base">📡</span>
                </div>
                <p className="text-[10px] text-emerald-300/80 mt-1">Generates QR Code & pairing code to receive iPhone shifts</p>
              </button>

              <button
                type="button"
                onClick={() => { setP2pModalOpen(true); setP2pRole('client'); }}
                className="p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-blue-400">📱 Sync to Desktop (iPhone Sender)</span>
                  <span className="text-base">📲</span>
                </div>
                <p className="text-[10px] text-blue-300/80 mt-1">Connects over WebRTC DataChannel using Desktop Pairing ID</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleReRunOnboarding}
          className="btn-ghost text-xs cursor-pointer"
          title="Re-open the welcome setup modal"
        >
          🔄 Re-run Welcome Setup
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="btn-primary px-8"
        >
          Save Changes
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-xl text-center text-xs font-bold border animate-fade-in" style={{ background: 'color-mix(in srgb, var(--accent2) 20%, transparent)', borderColor: 'var(--accent2)', color: 'var(--accent1)' }}>
          ✓ Settings saved successfully!
        </div>
      )}

      {/* ========================================================================= */}
      {/* WebRTC P2P DIRECT LOCAL NETWORK SYNC MODAL */}
      {/* ========================================================================= */}
      {p2pModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">📶</span>
                <h3 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                  WebRTC P2P Direct Local Network Sync
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseP2pModal}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border cursor-pointer"
                style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Host / Receiver Mode */}
              {p2pRole === 'host' && (
                <div className="space-y-3 text-center">
                  <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                    Scan QR code on iPhone or enter Pairing ID to sync shift ledgers directly over WebRTC.
                  </p>

                  {/* Desktop QR Code Component */}
                  {hostPairId && (
                    <ShowSyncQRCode peerId={hostPairId} />
                  )}

                  {isConnecting && (
                    <p className="text-xs font-bold text-emerald-400 animate-pulse">Initializing WebRTC Peer Node...</p>
                  )}
                </div>
              )}

              {/* Client / Sender Mode */}
              {p2pRole === 'client' && (
                <div className="space-y-3">
                  <p className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                    Scan Desktop Screen or enter Desktop Pairing ID to transmit iPhone shifts over WebRTC.
                  </p>

                  {/* iPhone Camera Scanner Component */}
                  <ScanDesktopQR onConnect={handleStartClientSync} />

                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-sub)' }}>
                      Desktop Host Pairing ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. evrytrack-host-abc123"
                      value={targetPairId}
                      onChange={(e) => setTargetPairId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wide"
                      style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleStartClientSync}
                    disabled={isConnecting}
                    className="w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent1)', color: 'var(--btn-text)' }}
                  >
                    <span>⚡️ Connect & Sync over WebRTC</span>
                  </button>
                </div>
              )}

              {/* Live P2P Connection Status Banner */}
              {p2pStatus && (
                <div className="p-3 rounded-xl border font-mono text-[11px] leading-relaxed bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                  {p2pStatus}
                </div>
              )}

              {/* CRDT Resolution Footer Note */}
              <div className="pt-2 border-t text-[10px] text-center" style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}>
                🛡️ <strong>CRDT Conflict Resolution Active:</strong> Entries merge automatically by timestamp (updatedAt) so no data is overwritten.
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseP2pModal}
              className="w-full py-2.5 rounded-xl font-bold text-xs shadow-lg cursor-pointer mt-2"
              style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT W-2 JOB MODAL */}
      {/* ========================================================================= */}
      {jobModalOpen && editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 bg-slate-900 border-gray-800 text-white">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-extrabold text-sm text-emerald-400 flex items-center gap-2">
                <span>🏢</span>
                <span>{editingJob.id ? 'Edit W-2 Employer Profile' : 'Add New W-2 Employer'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setJobModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-gray-700 bg-slate-800 text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Employer / Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Warehouse, Target, Main Corp"
                  value={editingJob.title || ''}
                  onChange={e => setEditingJob(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Pay Frequency Schedule</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-xl border border-gray-700">
                  {[
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'biweekly', label: 'Bi-Weekly' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'semimonthly', label: 'Semi-Monthly' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setEditingJob(p => ({ ...p, payFrequency: f.id }))}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                        editingJob.payFrequency === f.id ? 'bg-emerald-500 text-black' : 'text-gray-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {editingJob.payFrequency === 'monthly' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Day of Month for Paycheck</label>
                  <select
                    value={editingJob.paydayOfMonth || 1}
                    onChange={e => setEditingJob(p => ({ ...p, paydayOfMonth: parseInt(e.target.value, 10) }))}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white font-mono font-bold"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day === 1 ? '1st of month' : day === 15 ? '15th of month' : day === 31 ? 'Last day of month (31st/28th Feb)' : `${day}th of month`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(editingJob.payFrequency === 'biweekly' || editingJob.payFrequency === 'weekly') && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Next Expected Paycheck Date</label>
                  <input
                    type="date"
                    value={editingJob.nextPaydayDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setEditingJob(p => ({ ...p, nextPaydayDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Expected Paycheck Amount ($)</label>
                <input
                  type="number"
                  placeholder="1830.00"
                  value={editingJob.paycheckAmount || ''}
                  onChange={e => setEditingJob(p => ({ ...p, paycheckAmount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Job Start Date</label>
                <input
                  type="date"
                  value={editingJob.startDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setEditingJob(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-800 border-gray-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Past Months Tracking Option</label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingJob(p => ({ ...p, trackScope: 'forward' }))}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      (editingJob.trackScope || 'forward') === 'forward'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    <div>🟢 Start tracking from Start Date forward (Recommended for Future Jobs)</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Fixed salary only applies to calendar months starting on or after your job start date. Months prior (e.g. June/July) show $0.00.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingJob(p => ({ ...p, trackScope: 'backfill' }))}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      editingJob.trackScope === 'backfill'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                        : 'bg-slate-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    <div>⏪ Backfill & Apply to past months</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Applies this fixed salary baseline to all prior months in your calendar history.
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setJobModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-gray-300 border border-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveJobModal(editingJob)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-black cursor-pointer shadow-lg"
              >
                Save Job Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-TIER JOB DELETION OPTIONS MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 bg-slate-900 border-rose-500/40 text-white">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-extrabold text-sm text-rose-400 flex items-center gap-2">
                <span>🗑 Delete Job Profile:</span>
                <span className="text-white">{jobToDelete.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-gray-700 bg-slate-800 text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Choose how you want to handle this job profile and your historical paycheck records:
            </p>

            <div className="space-y-2 text-xs">
              {/* Option 1: Deactivate */}
              <button
                type="button"
                onClick={() => handleConfirmDeleteJob('deactivate')}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>⏸ Option 1: Deactivate Job (Recommended)</span>
                </div>
                <p className="text-[10px] text-emerald-200/80 mt-1 leading-normal">
                  Removes job from future payday calendars, but keeps 100% of past paychecks and monthly totals intact.
                </p>
              </button>

              {/* Option 2: Delete Profile & Retain History */}
              <button
                type="button"
                onClick={() => handleConfirmDeleteJob('delete_retain_history')}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              >
                <div className="font-bold text-blue-400 flex items-center gap-1.5">
                  <span>📦 Option 2: Delete Profile & Retain History</span>
                </div>
                <p className="text-[10px] text-blue-200/80 mt-1 leading-normal">
                  Removes job settings from your list. All historical paychecks previously logged in past monthly statements remain saved.
                </p>
              </button>

              {/* Option 3: Hard Delete */}
              <button
                type="button"
                onClick={() => handleConfirmDeleteJob('hard_delete')}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20"
              >
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <span>⚠️ Option 3: Hard Delete & Wipe Past Checks</span>
                </div>
                <p className="text-[10px] text-rose-300/80 mt-1 leading-normal">
                  Permanently deletes job profile AND wipes associated paychecks from past monthly statements. Total earnings history will change.
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-gray-300 border border-gray-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RE-ACTIVATE JOB PROMPT MODAL */}
      {/* ========================================================================= */}
      {reactivateModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-emerald-400">
                <span>🏢</span>
                <span>Re-Activating {reactivateModalJob.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReactivateModalJob(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-gray-700 bg-slate-800 text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              Welcome back! Are your pay schedule and expected paycheck amount still the same as before for <strong>{reactivateModalJob.title}</strong>?
            </p>

            {/* Quick Summary of Existing Details */}
            <div className="p-3 rounded-2xl border text-xs font-mono space-y-1" style={{ background: 'color-mix(in srgb, var(--accent1) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--accent1) 30%, transparent)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-sub)' }}>Current Schedule:</span>
                <span className="font-bold capitalize text-emerald-400">{reactivateModalJob.payFrequency}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-sub)' }}>Expected Check:</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>${parseFloat(reactivateModalJob.paycheckAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Decision Options */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmReactivation(true)}
                className="w-full p-3 rounded-xl font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <span>🟢 Yes, Keep Same Pay Details & Re-Activate</span>
              </button>

              <div className="p-3.5 rounded-2xl border space-y-3 mt-2" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-bold text-amber-400">✏️ Update Pay Details First:</p>

                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-sub)' }}>Pay Frequency</label>
                  <select
                    value={reactivateDetails.payFrequency}
                    onChange={e => setReactivateDetails(p => ({ ...p, payFrequency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border font-bold text-xs"
                    style={{ background: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="semimonthly">Semi-Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-sub)' }}>New Expected Check ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={reactivateModalJob.paycheckAmount}
                    value={reactivateDetails.paycheckAmount}
                    onChange={e => setReactivateDetails(p => ({ ...p, paycheckAmount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs"
                    style={{ background: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                </div>

                {reactivateDetails.payFrequency === 'monthly' && (
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-sub)' }}>Payday Day of Month</label>
                    <select
                      value={reactivateDetails.paydayOfMonth}
                      onChange={e => setReactivateDetails(p => ({ ...p, paydayOfMonth: parseInt(e.target.value, 10) }))}
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs"
                      style={{ background: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}th of month</option>
                      ))}
                    </select>
                  </div>
                )}

                {(reactivateDetails.payFrequency === 'biweekly' || reactivateDetails.payFrequency === 'weekly') && (
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-sub)' }}>Next Payday Date</label>
                    <input
                      type="date"
                      value={reactivateDetails.nextPaydayDate}
                      onChange={e => setReactivateDetails(p => ({ ...p, nextPaydayDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs"
                      style={{ background: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleConfirmReactivation(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-black hover:bg-amber-400 cursor-pointer shadow-md transition-all"
                >
                  <span>✏️ Save New Details & Re-Activate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
