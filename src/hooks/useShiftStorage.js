import { useState, useEffect, useCallback } from 'react';
import { getMonthKey } from '../utils/prop22Engine';

const STORAGE_PREFIX = 'gigtrack_shifts_';

/**
 * Custom hook for persisting shift entries to LocalStorage, keyed by YYYY-MM.
 *
 * @param {string} monthKey - e.g. "2025-07"
 * @returns {{
 *   entries: Object,           // dateStr -> shiftData
 *   saveEntry: Function,       // (dateStr, data) => void
 *   deleteEntry: Function,     // (dateStr) => void
 *   clearMonth: Function,      // () => void
 *   entriesArray: Array,       // sorted array of shift entries
 * }}
 */
export function useShiftStorage(monthKey) {
  const storageKey = STORAGE_PREFIX + monthKey;

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const [entries, setEntries] = useState(load);

  // Reload when month changes
  useEffect(() => {
    setEntries(load());
  }, [load]);

  const persist = useCallback((data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  }, [storageKey]);

  const saveEntry = useCallback((dateStr, shiftData) => {
    setEntries(prev => {
      const next = { ...prev, [dateStr]: { ...shiftData, date: dateStr } };
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteEntry = useCallback((dateStr) => {
    setEntries(prev => {
      const next = { ...prev };
      delete next[dateStr];
      persist(next);
      return next;
    });
  }, [persist]);

  const clearMonth = useCallback(() => {
    localStorage.removeItem(storageKey);
    setEntries({});
  }, [storageKey]);

  // Sorted array of entries
  const entriesArray = Object.values(entries).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return { entries, saveEntry, deleteEntry, clearMonth, entriesArray };
}

/**
 * Helper to compute effective monthly salary from amount and pay frequency.
 */
export function calculateMonthlySalary(amount, frequency) {
  const num = parseFloat(amount) || 0;
  if (num <= 0) return 0;
  switch (frequency) {
    case 'biweekly':
      return Math.round((num * 26 / 12) * 100) / 100;
    case 'weekly':
      return Math.round((num * 52 / 12) * 100) / 100;
    case 'semimonthly':
      return Math.round((num * 2) * 100) / 100;
    case 'monthly':
    default:
      return num;
  }
}

/**
 * Computes combined monthly salary baseline across all active W-2 jobs.
 */
export function calculateJobsMonthlyTotal(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return 0;
  return jobs.reduce((sum, job) => {
    if (job && job.status === 'deactivated') return sum;
    const amt = parseFloat(job?.paycheckAmount) || 0;
    const freq = job?.payFrequency || 'monthly';
    return sum + calculateMonthlySalary(amt, freq);
  }, 0);
}

export const DEFAULT_GIG_PLATFORMS = [
  { id: 'instacart', name: 'Instacart', icon: '🛒', active: true },
  { id: 'doordash', name: 'DoorDash', icon: '🚗', active: false },
  { id: 'uber', name: 'Uber / Uber Eats', icon: '🚕', active: false },
  { id: 'amazon_flex', name: 'Amazon Flex', icon: '📦', active: false },
  { id: 'grubhub', name: 'Grubhub', icon: '🚲', active: false },
  { id: 'lyft', name: 'Lyft', icon: '🚘', active: false },
];

/**
 * Hook to persist and retrieve the income settings (salary, frequency, workType, goal, minWage).
 */
export function useIncomeSettings() {
  const SETTINGS_KEY = 'gigtrack_settings';

  const defaultSettings = {
    workType: 'both',            // 'both' | 'gig_only' | 'w2_only'
    payFrequency: 'monthly',     // 'monthly' | 'biweekly' | 'weekly' | 'semimonthly'
    salaryAmount: 0,
    fixedSalary: 0,
    paydayOfMonth: 1,            // Day of month (1-31) for Monthly pay schedule
    nextPaydayDate: new Date().toISOString().split('T')[0], // Next expected payday date for Bi-Weekly & Weekly
    paydaySemi1: 1,              // Day 1 for Semi-Monthly
    paydaySemi2: 15,             // Day 2 for Semi-Monthly
    jobs: [],
    gigPlatforms: DEFAULT_GIG_PLATFORMS,
    monthlyGoal: 5000,
    localMinWage: 16.90,
    includeMiles: false,         // Default: OFF
    mileRate: 0.37,
    theme: 'vibrant',            // 'vibrant' | 'vibrant-light' | 'emerald' | 'emerald-light' | etc.
    onboardingCompleted: false,   // Trigger clean welcome setup modal on fresh install
  };

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        return defaultSettings;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        return defaultSettings;
      }

      let jobsList = Array.isArray(parsed.jobs) ? [...parsed.jobs] : [];
      const primaryJob = jobsList.find(j => j && j.status === 'active') || jobsList[0];
      const topAmount = primaryJob ? (parseFloat(primaryJob.paycheckAmount) || 0) : (parsed.salaryAmount !== undefined ? parseFloat(parsed.salaryAmount) : 0);
      const topFreq = primaryJob ? (primaryJob.payFrequency || 'monthly') : (parsed.payFrequency || 'monthly');

      const computedFixed = calculateJobsMonthlyTotal(jobsList);

      const platformsList = Array.isArray(parsed.gigPlatforms) && parsed.gigPlatforms.length > 0
        ? parsed.gigPlatforms
        : DEFAULT_GIG_PLATFORMS;

      const updated = {
        ...defaultSettings,
        ...parsed,
        salaryAmount: topAmount,
        payFrequency: topFreq,
        jobs: jobsList,
        gigPlatforms: platformsList,
        fixedSalary: computedFixed,
        onboardingCompleted: parsed.onboardingCompleted ?? false,
      };

      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch {}

      return updated;
    } catch {
      return defaultSettings;
    }
  });

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const merged = { ...prev, ...updates };

      let jobsList = Array.isArray(merged.jobs) ? [...merged.jobs] : [];
      const primaryJob = jobsList.find(j => j && j.status === 'active') || jobsList[0];
      const topAmount = primaryJob ? (parseFloat(primaryJob.paycheckAmount) || 0) : 0;
      const topFreq = primaryJob ? (primaryJob.payFrequency || 'monthly') : (merged.payFrequency || 'monthly');

      merged.jobs = jobsList;
      merged.salaryAmount = topAmount;
      merged.payFrequency = topFreq;
      merged.fixedSalary = calculateJobsMonthlyTotal(jobsList);

      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    });
  }, []);

  return { settings, updateSettings };
}
