import { calculateProp22, formatCurrency, convertTimeToDecimal } from './prop22Engine';
import { calculateMonthlySalary } from '../hooks/useShiftStorage';
import { getW2SalaryForMonth as calculateW2ForMonth } from './jobManagerEngine';

/**
 * Gets the specific W-2 salary for a given monthKey (YYYY-MM).
 * Respects job start dates and tracking scopes ('forward' vs 'backfill').
 */
export function getW2SalaryForMonth(monthKey, settings) {
  if (settings?.workType === 'gig_only') return 0;
  if (monthKey && typeof monthKey === 'string' && monthKey.includes('-')) {
    const parts = monthKey.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (!isNaN(y) && !isNaN(m)) {
      return calculateW2ForMonth(y, m, settings);
    }
  }
  return parseFloat(settings?.salaryAmount) || 0;
}

/**
 * Persists a month-specific W-2 salary override so historical months stay untouched.
 */
export function setW2SalaryForMonth(monthKey, amount) {
  try {
    localStorage.setItem('evrytrack_w2_salary_' + monthKey, String(amount));
  } catch (e) {
    console.warn('LocalStorage W-2 salary write failed:', e);
  }
}

/**
 * Generates itemized W-2 paychecks for the month based on active multi-job profiles.
 */
export function generateW2Paychecks(settings, monthYearLabel = 'Current Month', monthKey = null) {
  const workType = settings?.workType || 'both';
  if (workType === 'gig_only') return [];

  const jobs = Array.isArray(settings?.jobs) ? settings.jobs : [];

  if (jobs.length > 0) {
    const paychecks = [];
    const [yStr, mStr] = monthKey && monthKey.includes('-') ? monthKey.split('-') : [new Date().getFullYear(), new Date().getMonth() + 1];
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;

    for (const job of jobs) {
      if (!job || job.status === 'deactivated') continue;

      if (job.startDate && (job.trackScope || 'forward') === 'forward') {
        const startObj = new Date(job.startDate + 'T00:00:00');
        const viewObj = new Date(y, m, 1);
        if (!isNaN(startObj.getTime()) && viewObj < new Date(startObj.getFullYear(), startObj.getMonth(), 1)) {
          continue; // Job not started yet for this calendar month
        }
      }

      const amt = parseFloat(job.paycheckAmount) || 0;
      const freq = job.payFrequency || 'monthly';
      const monthlyTotal = calculateMonthlySalary(amt, freq);
      if (monthlyTotal <= 0) continue;

      const actualLogs = settings?.actualPaychecks || {};

      if (freq === 'monthly') {
        const key = `${monthKey}_${job.id}`;
        const actualLog = actualLogs[key];
        const finalAmt = actualLog ? parseFloat(actualLog.amount) || monthlyTotal : monthlyTotal;

        paychecks.push({
          id: `w2-chk-${job.id}-1`,
          jobId: job.id,
          title: `${job.title} Paycheck`,
          dateLabel: 'End of Month',
          amount: finalAmt,
          expectedAmount: monthlyTotal,
          isLogged: !!actualLog,
          frequencyLabel: 'Monthly Payout',
        });
      } else if (freq === 'biweekly') {
        paychecks.push({
          id: `w2-chk-${job.id}-1`,
          jobId: job.id,
          title: `${job.title} Paycheck #1`,
          dateLabel: 'Mid-Month Deposit (15th)',
          amount: amt,
          expectedAmount: amt,
          frequencyLabel: 'Bi-Weekly Payout',
        });
        paychecks.push({
          id: `w2-chk-${job.id}-2`,
          jobId: job.id,
          title: `${job.title} Paycheck #2`,
          dateLabel: 'End of Month Deposit (31st)',
          amount: amt,
          expectedAmount: amt,
          frequencyLabel: 'Bi-Weekly Payout',
        });
      } else if (freq === 'weekly') {
        for (let i = 1; i <= 4; i++) {
          paychecks.push({
            id: `w2-chk-${job.id}-${i}`,
            jobId: job.id,
            title: `${job.title} Paycheck #${i}`,
            dateLabel: `Week ${i} Friday Deposit`,
            amount: amt,
            expectedAmount: amt,
            frequencyLabel: 'Weekly Payout',
          });
        }
      }
    }
    return paychecks;
  }

  const rawAmt = monthKey ? getW2SalaryForMonth(monthKey, settings) : (parseFloat(settings?.salaryAmount) || 0);
  const frequency = settings?.payFrequency || 'monthly';

  if (rawAmt <= 0) return [];

  const paychecks = [];

  if (frequency === 'monthly') {
    paychecks.push({
      id: 'w2-chk-1',
      title: 'W-2 Salary Paycheck #1',
      dateLabel: 'End of Month',
      amount: rawAmt,
      frequencyLabel: 'Monthly Payout',
    });
  } else if (frequency === 'biweekly') {
    const chkAmt = Math.round((rawAmt) * 100) / 100;
    paychecks.push({
      id: 'w2-chk-1',
      title: 'W-2 Salary Paycheck #1',
      dateLabel: 'Mid-Month Deposit (15th)',
      amount: chkAmt,
      frequencyLabel: 'Bi-Weekly Payout',
    });
    paychecks.push({
      id: 'w2-chk-2',
      title: 'W-2 Salary Paycheck #2',
      dateLabel: 'End of Month Deposit (31st)',
      amount: chkAmt,
      frequencyLabel: 'Bi-Weekly Payout',
    });
  } else if (frequency === 'weekly') {
    const chkAmt = Math.round((rawAmt) * 100) / 100;
    for (let i = 1; i <= 4; i++) {
      paychecks.push({
        id: `w2-chk-${i}`,
        title: `W-2 Salary Paycheck #${i}`,
        dateLabel: `Week ${i} Friday Deposit`,
        amount: chkAmt,
        frequencyLabel: 'Weekly Payout',
      });
    }
  }

  return paychecks;
}

/**
 * Computes tip ratio analytics and earnings breakdown.
 */
export function calculateTipAnalytics(entriesArray = [], settings = {}) {
  let totalBase = 0;
  let totalTips = 0;
  let totalFloor = 0;
  let totalTopUp = 0;
  let totalShopperBumps = 0;
  let totalGigEarnings = 0;
  let totalHours = 0;

  entriesArray.forEach(entry => {
    const calc = calculateProp22({
      ...entry,
      localMinWage: settings.localMinWage,
      mileRate: settings.mileRate,
      includeMiles: settings.includeMiles,
    });

    totalBase += parseFloat(entry.basePay) || 0;
    totalTips += parseFloat(entry.tips) || 0;
    totalFloor += calc.prop22Floor;
    totalTopUp += calc.adjustmentTopUp;
    const bump = parseFloat(entry.shopperBump || entry.bump) || 0;
    totalShopperBumps += bump;
    totalGigEarnings += calc.totalShiftEarnings + bump;
    totalHours += parseFloat(entry.activeHours) || 0;
  });

  const tipRatio = totalGigEarnings > 0 ? (totalTips / totalGigEarnings) * 100 : 0;
  const baseRatio = totalGigEarnings > 0 ? (totalBase / totalGigEarnings) * 100 : 0;
  const topUpRatio = totalGigEarnings > 0 ? (totalTopUp / totalGigEarnings) * 100 : 0;
  const bumpRatio = totalGigEarnings > 0 ? (totalShopperBumps / totalGigEarnings) * 100 : 0;
  const tipPerHour = totalHours > 0 ? totalTips / totalHours : 0;
  const totalGigPerHour = totalHours > 0 ? totalGigEarnings / totalHours : 0;

  const forecastTips = (targetHours = 17) => {
    return Math.round(targetHours * tipPerHour * 100) / 100;
  };

  const forecastTotalGig = (targetHours = 17) => {
    return Math.round(targetHours * totalGigPerHour * 100) / 100;
  };

  return {
    totalBase,
    totalTips,
    totalFloor,
    totalTopUp,
    totalShopperBumps,
    totalGigEarnings,
    totalHours,
    tipRatio: Math.round(tipRatio * 10) / 10,
    baseRatio: Math.round(baseRatio * 10) / 10,
    topUpRatio: Math.round(topUpRatio * 10) / 10,
    bumpRatio: Math.round(bumpRatio * 10) / 10,
    tipPerHour: Math.round(tipPerHour * 100) / 100,
    totalGigPerHour: Math.round(totalGigPerHour * 100) / 100,
    forecastTips,
    forecastTotalGig,
  };
}

/**
 * Safely retrieves shift data for a date from memory map or LocalStorage neighboring month.
 */
function getShiftForDate(dateStr, currentMap = {}) {
  if (currentMap[dateStr]) return currentMap[dateStr];
  try {
    const monthKey = dateStr.slice(0, 7);
    const raw = localStorage.getItem('gigtrack_shifts_' + monthKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[dateStr]) {
        return parsed[dateStr];
      }
    }
  } catch {
    // Ignore storage read error
  }
  return null;
}

/**
 * Groups entries by Monday-Sunday pay periods with itemized daily calculations.
 * Generates full 7-day weeks and flags shifts on dates outside targetMonthKey as isOutsideMonth: true.
 */
export function groupEntriesByWeek(entriesArray = [], settings = {}, targetMonthKey = null) {
  if (!entriesArray || entriesArray.length === 0) return [];

  const currentMap = {};
  entriesArray.forEach(e => {
    currentMap[e.date] = e;
  });

  let targetMonthStr = targetMonthKey;
  if (!targetMonthStr && entriesArray.length > 0) {
    targetMonthStr = entriesArray[0].date.slice(0, 7);
  }

  const weekMap = new Map();

  entriesArray.forEach(entry => {
    const dateObj = new Date(entry.date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + diffToMon);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const key = monday.toISOString().slice(0, 10);

    if (!weekMap.has(key)) {
      weekMap.set(key, { monday, sunday });
    }
  });

  return Array.from(weekMap.values()).map((weekGroup) => {
    let totalHours = 0;
    let totalMiles = 0;
    let totalBase = 0;
    let totalTips = 0;
    let totalFloor = 0;
    let totalTopUp = 0;
    let totalEarnings = 0;

    let allHours = 0;
    let allMiles = 0;
    let allBase = 0;
    let allTips = 0;

    const weekEntries = [];
    const currDate = new Date(weekGroup.monday);

    for (let i = 0; i < 7; i++) {
      const dateStr = currDate.toISOString().slice(0, 10);
      const entryMonthStr = dateStr.slice(0, 7);
      const isOutsideMonth = targetMonthStr ? (entryMonthStr !== targetMonthStr) : false;

      const rawEntry = getShiftForDate(dateStr, currentMap);

      if (rawEntry) {
        const calc = calculateProp22({
          ...rawEntry,
          localMinWage: settings.localMinWage,
          mileRate: settings.mileRate,
          includeMiles: settings.includeMiles,
        });

        const h = (rawEntry.activeTimeH !== undefined || rawEntry.activeTimeM !== undefined || rawEntry.activeTimeS !== undefined)
          ? convertTimeToDecimal(rawEntry.activeTimeH, rawEntry.activeTimeM, rawEntry.activeTimeS)
          : parseFloat(rawEntry.activeHours) || 0;
        const m = parseFloat(rawEntry.activeMiles) || 0;
        const b = parseFloat(rawEntry.basePay) || 0;
        const t = parseFloat(rawEntry.tips) || 0;

        allHours += h;
        allMiles += m;
        allBase += b;
        allTips += t;

        if (!isOutsideMonth) {
          totalHours += h;
          totalMiles += m;
          totalBase += b;
          totalTips += t;
        }

        weekEntries.push({
          ...rawEntry,
          date: dateStr,
          isOutsideMonth,
          hasShift: true,
          calc,
        });
      } else if (isOutsideMonth) {
        weekEntries.push({
          date: dateStr,
          activeHours: 0,
          activeMiles: 0,
          basePay: 0,
          tips: 0,
          isOutsideMonth: true,
          hasShift: false,
          calc: { prop22Floor: 0, adjustmentTopUp: 0, totalShiftEarnings: 0 },
        });
      }

      currDate.setDate(currDate.getDate() + 1);
    }

    const minWage = parseFloat(settings?.localMinWage) || 16.90;
    const mileRate = parseFloat(settings?.mileRate) || 0.37;
    const wageRate = minWage * 1.20;

    const formatWeekLabel = (m, s) => {
      const monStr = m.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sunStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `Pay Period: ${monStr} – ${sunStr}`;
    };

    const weekLabel = formatWeekLabel(weekGroup.monday, weekGroup.sunday);
    const payoutKey = targetMonthStr ? `${targetMonthStr}:${weekLabel}` : weekLabel;

    // Shopper Bumps / Incentives
    const shopperBumpVal = settings?.shopperBumps?.[weekLabel] ?? settings?.shopperBumps?.[payoutKey];
    const shopperBump = parseFloat(shopperBumpVal) || 0;

    // 1. Calculate full week (all 7 days) Prop 22 guarantee & earnings (Base + Top-Up + Tips)
    const allHourlyFloor = allHours * wageRate;
    const allMileageGuarantee = settings?.includeMiles ? (allMiles * mileRate) : 0;
    const allFloor = Math.round((allHourlyFloor + allMileageGuarantee) * 100) / 100;
    const allTopUp = Math.round(Math.max(0, allFloor - allBase) * 100) / 100;
    const fullWeekWorkedEarnings = Math.round((allBase + allTopUp + allTips) * 100) / 100;
    const fullWeekCalculatedEarnings = Math.round((fullWeekWorkedEarnings + shopperBump) * 100) / 100;

    // 2. Calculate this month's portion of Prop 22 guarantee & earnings
    const hourlyGuarantee = totalHours * wageRate;
    const mileageGuarantee = settings?.includeMiles ? (totalMiles * mileRate) : 0;
    totalFloor = Math.round((hourlyGuarantee + mileageGuarantee) * 100) / 100;
    totalTopUp = Math.round(Math.max(0, totalFloor - totalBase) * 100) / 100;
    const monthWorkedEarnings = Math.round((totalBase + totalTopUp + totalTips) * 100) / 100;

    const monthRatio = fullWeekWorkedEarnings > 0 ? (monthWorkedEarnings / fullWeekWorkedEarnings) : 1;
    const monthShopperBump = Math.round((shopperBump * monthRatio) * 100) / 100;
    totalEarnings = Math.round((monthWorkedEarnings + monthShopperBump) * 100) / 100;

    // 3. Proportional deposit allocation & Variance calculation
    const actualPayoutVal = settings?.actualPayouts?.[weekLabel] ?? settings?.actualPayouts?.[payoutKey];
    const fullDepositNum = parseFloat(actualPayoutVal);
    const hasActualPayout = !isNaN(fullDepositNum) && actualPayoutVal !== '';

    let allocatedPayout = null;
    let variance = 0;

    if (hasActualPayout) {
      // Strip out full shopper bump if deposit included it, then allocate worked share
      const workedDeposit = fullDepositNum >= (fullWeekWorkedEarnings + shopperBump * 0.5) && shopperBump > 0
        ? (fullDepositNum - shopperBump)
        : fullDepositNum;

      const allocatedWorkedDeposit = Math.round((workedDeposit * monthRatio) * 100) / 100;
      allocatedPayout = Math.round((allocatedWorkedDeposit + monthShopperBump) * 100) / 100;
      variance = Math.round((allocatedWorkedDeposit - monthWorkedEarnings) * 100) / 100;
    }

    return {
      label: weekLabel,
      payoutKey,
      weekLabel,
      totalHours: Math.round(totalHours * 10) / 10,
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalBase: Math.round(totalBase * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      totalFloor: Math.round(totalFloor * 100) / 100,
      totalTopUp: Math.round(totalTopUp * 100) / 100,
      shopperBump: monthShopperBump,
      fullWeekShopperBump: Math.round(shopperBump * 100) / 100,
      totalEarnings,
      fullWeekCalculatedEarnings,
      fullDeposit: hasActualPayout ? fullDepositNum : null,
      actualPayout: allocatedPayout,
      variance,
      entries: weekEntries.sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
}

/**
 * Generates complete Monthly Bank Statement data object.
 */
export function generateMonthlyStatement(entriesArray = [], settings = {}, monthLabel = 'Current Month') {
  let targetMonthKey = null;
  if (entriesArray.length > 0) {
    targetMonthKey = entriesArray[0].date.slice(0, 7);
  }

  const w2Paychecks = generateW2Paychecks(settings, monthLabel, targetMonthKey);
  const tipAnalytics = calculateTipAnalytics(entriesArray, settings);
  const groupedWeeks = groupEntriesByWeek(entriesArray, settings, targetMonthKey);

  let totalMiles = 0;
  entriesArray.forEach(e => {
    totalMiles += parseFloat(e.activeMiles) || 0;
  });

  const totalW2Income = w2Paychecks.reduce((sum, chk) => sum + chk.amount, 0);
  const grandTotalIncome = totalW2Income + tipAnalytics.totalGigEarnings;

  // ─── Deposit Summaries & Reconciliation ────────────────────────────────────
  let totalTrackedWorked = 0;
  let totalShopperBumps = 0;
  let totalBankDeposits = 0;
  let hasDepositsLogged = false;

  groupedWeeks.forEach(week => {
    totalTrackedWorked += week.totalEarnings - (week.shopperBump || 0);
    totalShopperBumps += (week.shopperBump || 0);
    if (week.actualPayout !== null) {
      totalBankDeposits += week.actualPayout;
      hasDepositsLogged = true;
    } else {
      totalBankDeposits += week.totalEarnings;
    }
  });

  const totalTrackedEarnings = totalTrackedWorked + totalShopperBumps;
  const totalVariance = totalBankDeposits - totalTrackedEarnings;

  const depositSummary = {
    totalTrackedWorked,
    totalShopperBumps,
    totalTrackedEarnings,
    totalBankDeposits,
    totalVariance,
    hasDepositsLogged,
  };

  // W-2 Deposit Reconciliation
  const actualW2Paychecks = settings?.actualW2Paychecks || {};
  const actualW2Val = parseFloat(actualW2Paychecks[targetMonthKey]) || parseFloat(actualW2Paychecks[monthLabel]) || null;
  const expectedW2Salary = totalW2Income;
  const actualW2Deposited = actualW2Val !== null ? actualW2Val : expectedW2Salary;
  const w2Variance = actualW2Deposited - expectedW2Salary;

  const w2DepositSummary = {
    expectedW2Salary,
    actualW2Deposited,
    w2Variance,
    hasW2Logged: actualW2Val !== null,
  };

  // Combined Deposit Reconciliation Summary
  const totalRealWorldDeposits = totalBankDeposits + (settings?.workType !== 'gig_only' ? actualW2Deposited : 0);
  const totalEvryTrackIncome = totalTrackedEarnings + (settings?.workType !== 'gig_only' ? expectedW2Salary : 0);
  const totalCombinedVariance = depositSummary.totalVariance + (settings?.workType !== 'gig_only' ? w2Variance : 0);

  const combinedDepositSummary = {
    totalRealWorldDeposits,
    totalEvryTrackIncome,
    totalCombinedVariance,
  };

  const statementId = `EVR-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    statementId,
    monthLabel,
    generatedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    workType: settings?.workType || 'both',
    payFrequency: settings?.payFrequency || 'monthly',
    w2Paychecks,
    totalW2Income,
    totalMiles,
    tipAnalytics,
    groupedWeeks,
    grandTotalIncome,
    depositSummary,
    w2DepositSummary,
    combinedDepositSummary,
  };
}

/**
 * Generates Year-End Annual Financial Statement & Tax Rollup Summary object.
 * Reads all 12 months from LocalStorage for full 12-month comparative breakdown.
 */
export function generateAnnualRollup(entriesArray = [], settings = {}, year = 2026) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let totalMilesAllYear = 0;
  let totalBaseAllYear = 0;
  let totalTipsAllYear = 0;
  let totalTopUpAllYear = 0;
  let totalGigAllYear = 0;
  let totalHoursAllYear = 0;
  let totalW2AllYear = 0;

  const monthlyRows = [];

  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    let mEntries = [];

    if (entriesArray.length > 0 && entriesArray[0].date.startsWith(monthKey)) {
      mEntries = entriesArray;
    } else {
      try {
        const raw = localStorage.getItem('gigtrack_shifts_' + monthKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          mEntries = Object.values(parsed);
        }
      } catch {
        mEntries = [];
      }
    }

    // Get specific W-2 salary for this month (historical month protection!)
    const mW2 = getW2SalaryForMonth(monthKey, settings);
    totalW2AllYear += mW2;

    let mMiles = 0;
    let mBase = 0;
    let mTips = 0;
    let mTopUp = 0;
    let mGig = 0;
    let mHours = 0;

    mEntries.forEach(entry => {
      const calc = calculateProp22({
        ...entry,
        localMinWage: settings.localMinWage,
        mileRate: settings.mileRate,
        includeMiles: settings.includeMiles,
      });

      mMiles += parseFloat(entry.activeMiles) || 0;
      mBase += parseFloat(entry.basePay) || 0;
      mTips += parseFloat(entry.tips) || 0;
      mTopUp += calc.adjustmentTopUp;
      mGig += calc.totalShiftEarnings;
      mHours += parseFloat(entry.activeHours) || 0;
    });

    totalMilesAllYear += mMiles;
    totalBaseAllYear += mBase;
    totalTipsAllYear += mTips;
    totalTopUpAllYear += mTopUp;
    totalGigAllYear += mGig;
    totalHoursAllYear += mHours;

    const effectiveRate = mHours > 0 ? (mGig / mHours) : 0;

    monthlyRows.push({
      monthNum: m,
      monthName: monthNames[m - 1],
      hasData: mEntries.length > 0 || mW2 > 0,
      shiftCount: mEntries.length,
      w2Amount: mW2,
      miles: Math.round(mMiles * 10) / 10,
      basePay: mBase,
      tips: mTips,
      topUp: mTopUp,
      gigTotal: mGig,
      hours: Math.round(mHours * 10) / 10,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
    });
  }

  const grandTotalAnnual = totalW2AllYear + totalGigAllYear;

  const tipRatio = totalGigAllYear > 0 ? (totalTipsAllYear / totalGigAllYear) * 100 : 0;
  const baseRatio = totalGigAllYear > 0 ? (totalBaseAllYear / totalGigAllYear) * 100 : 0;
  const topUpRatio = totalGigAllYear > 0 ? (totalTopUpAllYear / totalGigAllYear) * 100 : 0;
  const tipPerHour = totalHoursAllYear > 0 ? totalTipsAllYear / totalHoursAllYear : 0;
  const gigPerHour = totalHoursAllYear > 0 ? totalGigAllYear / totalHoursAllYear : 0;

  const exampleMileageRate = 0.67;
  const estimatedMileageDeduction = Math.round(totalMilesAllYear * exampleMileageRate * 100) / 100;
  const deductionExampleText = `(Example: ${totalMilesAllYear.toLocaleString('en-US', { maximumFractionDigits: 1 })} miles × $0.67/mi = ~${formatCurrency(estimatedMileageDeduction)} estimated potential deduction — consult your tax professional)`;

  const statementId = `EVR-ANNUAL-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    statementId,
    year,
    generatedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    workType: settings?.workType || 'both',
    payFrequency: settings?.payFrequency || 'monthly',
    totalAnnualW2: totalW2AllYear,
    totalMiles: Math.round(totalMilesAllYear * 10) / 10,
    exampleMileageRate,
    estimatedMileageDeduction,
    deductionExampleText,
    totalBaseAllYear,
    totalTipsAllYear,
    totalTopUpAllYear,
    totalGigAllYear,
    totalHoursAllYear: Math.round(totalHoursAllYear * 100) / 100,
    tipRatio: Math.round(tipRatio * 10) / 10,
    baseRatio: Math.round(baseRatio * 10) / 10,
    topUpRatio: Math.round(topUpRatio * 10) / 10,
    tipPerHour: Math.round(tipPerHour * 100) / 100,
    gigPerHour: Math.round(gigPerHour * 100) / 100,
    monthlyRows,
    grandTotalAnnual,
  };
}
