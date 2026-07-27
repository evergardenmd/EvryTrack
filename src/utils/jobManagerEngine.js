/**
 * EvryTrack W-2 Multi-Job Manager & Paycheck Calendar Engine
 * Supports multiple active W-2 jobs, status toggling (Active / Deactivated),
 * multi-job payday calculations, historical backfilling, and 3-tier deletion.
 */

import { getDaysInMonth } from './payScheduleEngine';
import { calculateMonthlySalary } from '../hooks/useShiftStorage';

/**
 * Creates a standard W-2 Job Object schema.
 */
export function createDefaultJob(overrides = {}) {
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: overrides.title || 'Primary W-2 Job',
    workType: overrides.workType || 'w2',            // 'w2' | 'gig'
    status: overrides.status || 'active',            // 'active' | 'deactivated'
    payFrequency: overrides.payFrequency || 'monthly',// 'monthly' | 'biweekly' | 'weekly' | 'semimonthly'
    paydayOfMonth: overrides.paydayOfMonth || 1,
    nextPaydayDate: overrides.nextPaydayDate || new Date().toISOString().split('T')[0],
    paydaySemi1: overrides.paydaySemi1 || 1,
    paydaySemi2: overrides.paydaySemi2 || 15,
    paycheckAmount: parseFloat(overrides.paycheckAmount) || 1830.00,
    startDate: overrides.startDate || new Date().toISOString().split('T')[0],
    trackScope: overrides.trackScope || 'forward',   // 'forward' (start from startDate) | 'backfill' (apply to all months)
    endDate: overrides.endDate || null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Computes month-specific W-2 fixed salary baseline.
 * Respects each job's startDate and trackScope ('forward' vs 'backfill').
 */
export function getW2SalaryForMonth(year, month, settings = {}) {
  if (settings.workType === 'gig_only') return 0;

  const jobs = Array.isArray(settings.jobs) && settings.jobs.length > 0
    ? settings.jobs
    : [
        {
          status: 'active',
          payFrequency: settings.payFrequency || 'monthly',
          paycheckAmount: settings.salaryAmount ?? settings.fixedSalary ?? 1830,
          startDate: settings.nextPaydayDate || new Date().toISOString().split('T')[0],
          trackScope: 'forward',
        }
      ];

  const viewDate = new Date(year, month, 1); // 0-indexed month

  let total = 0;
  for (const job of jobs) {
    if (!job || job.status === 'deactivated') continue;

    const trackScope = job.trackScope || 'forward';

    // If trackScope is 'forward', check if view month is BEFORE job's startDate
    if (trackScope === 'forward' && job.startDate) {
      const parts = job.startDate.split('-');
      const startYr = parseInt(parts[0], 10);
      const startMo = parseInt(parts[1], 10) - 1; // 0-indexed
      const startDateObj = new Date(startYr, startMo, 1);

      if (viewDate < startDateObj) {
        // Month is before job start date - skip for this month!
        continue;
      }
    }

    const amt = parseFloat(job.paycheckAmount) || 0;
    const freq = job.payFrequency || 'monthly';
    total += calculateMonthlySalary(amt, freq);
  }

  return total;
}

/**
 * Gets all currently active jobs from user settings.
 */
export function getActiveJobs(jobs = []) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter(j => j && j.status === 'active');
}

/**
 * Checks if a date matches any active W-2 job payday.
 * Returns array of matching jobs for that date.
 */
export function getPaydayJobsForDate(dateStr, jobs = []) {
  if (!dateStr || !Array.isArray(jobs)) return [];

  const active = getActiveJobs(jobs);
  if (active.length === 0) return [];

  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return [];

  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth() + 1;
  const targetDay = target.getDate();

  const matchingJobs = [];

  for (const job of active) {
    // Check if date is before job start date
    if (job.startDate) {
      const start = new Date(job.startDate + 'T00:00:00');
      if (target < start) continue;
    }

    const freq = job.payFrequency || 'monthly';
    let isMatch = false;

    if (freq === 'monthly') {
      const desiredDay = parseInt(job.paydayOfMonth || 1, 10);
      const maxDays = getDaysInMonth(targetYear, targetMonth);
      const actualPayday = Math.min(desiredDay, maxDays);
      isMatch = targetDay === actualPayday;
    } else if (freq === 'semimonthly') {
      const day1 = parseInt(job.paydaySemi1 || 1, 10);
      const day2 = parseInt(job.paydaySemi2 || 15, 10);
      const maxDays = getDaysInMonth(targetYear, targetMonth);
      isMatch = targetDay === Math.min(day1, maxDays) || targetDay === Math.min(day2, maxDays);
    } else if (freq === 'biweekly' || freq === 'weekly') {
      const anchorStr = job.nextPaydayDate || new Date().toISOString().split('T')[0];
      const anchor = new Date(anchorStr + 'T00:00:00');
      if (!isNaN(anchor.getTime())) {
        const intervalDays = freq === 'biweekly' ? 14 : 7;
        const diffMs = target.getTime() - anchor.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        isMatch = diffDays % intervalDays === 0;
      }
    }

    if (isMatch) {
      matchingJobs.push(job);
    }
  }

  return matchingJobs;
}

/**
 * Gets upcoming payday information across all active W-2 jobs.
 */
export function getNextPaydaysMultiJob(jobs = [], referenceDate = new Date()) {
  const active = getActiveJobs(jobs);
  if (active.length === 0) return [];

  const results = [];
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  for (const job of active) {
    const freq = job.payFrequency || 'monthly';
    let nextPayday = null;

    if (freq === 'monthly') {
      const desiredDay = parseInt(job.paydayOfMonth || 1, 10);
      let y = today.getFullYear();
      let m = today.getMonth() + 1;

      let maxDays = getDaysInMonth(y, m);
      let candidate = new Date(y, m - 1, Math.min(desiredDay, maxDays));

      if (candidate < today) {
        m++;
        if (m > 12) { m = 1; y++; }
        maxDays = getDaysInMonth(y, m);
        candidate = new Date(y, m - 1, Math.min(desiredDay, maxDays));
      }
      nextPayday = candidate;
    } else if (freq === 'biweekly' || freq === 'weekly') {
      const interval = freq === 'biweekly' ? 14 : 7;
      const anchorStr = job.nextPaydayDate || today.toISOString().split('T')[0];
      let anchor = new Date(anchorStr + 'T00:00:00');
      if (isNaN(anchor.getTime())) anchor = new Date(today);

      while (anchor < today) {
        anchor.setDate(anchor.getDate() + interval);
      }
      nextPayday = anchor;
    } else if (freq === 'semimonthly') {
      const day1 = parseInt(job.paydaySemi1 || 1, 10);
      const day2 = parseInt(job.paydaySemi2 || 15, 10);
      let y = today.getFullYear();
      let m = today.getMonth() + 1;
      let maxDays = getDaysInMonth(y, m);

      let d1 = new Date(y, m - 1, Math.min(day1, maxDays));
      let d2 = new Date(y, m - 1, Math.min(day2, maxDays));

      if (d1 >= today && d2 >= today) nextPayday = d1 < d2 ? d1 : d2;
      else if (d1 >= today) nextPayday = d1;
      else if (d2 >= today) nextPayday = d2;
      else {
        m++; if (m > 12) { m = 1; y++; }
        maxDays = getDaysInMonth(y, m);
        d1 = new Date(y, m - 1, Math.min(day1, maxDays));
        d2 = new Date(y, m - 1, Math.min(day2, maxDays));
        nextPayday = d1 < d2 ? d1 : d2;
      }
    }

    if (nextPayday) {
      const diffMs = nextPayday.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      results.push({
        jobId: job.id,
        title: job.title,
        dateStr: nextPayday.toISOString().split('T')[0],
        formattedDate: nextPayday.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        }),
        daysRemaining,
        paycheckAmount: parseFloat(job.paycheckAmount) || 0,
        payFrequency: freq,
      });
    }
  }

  // Sort upcoming paydays by closest date
  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
