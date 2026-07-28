/**
 * Prop 22 Income Calculation Engine
 *
 * California AB5/Prop 22 earnings guarantee calculator for gig workers.
 * Guarantees 120% of local minimum wage for active hours + $0.37/mile.
 */
/**
 * Convert hours / minutes / seconds to a precise decimal hour value.
 *
 * @param {number} hours   - Whole or fractional hours (0–24)
 * @param {number} minutes - Minutes component (0–59)
 * @param {number} seconds - Seconds component (0–59)
 * @returns {number} Decimal hours, e.g. 2h 28m 15s → 2.4708̄33…
 */
export function convertTimeToDecimal(hours = 0, minutes = 0, seconds = 0) {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  const s = parseInt(seconds, 10) || 0;
  return h + m / 60 + s / 3600;
}

/**
 * Calculate Prop 22 earnings for a single shift.
 *
 * @param {Object} params
 * @param {number} [params.activeHours]   - Decimal hours (legacy / seed data path)
 * @param {number} [params.activeTimeH]   - Hours component of time picker
 * @param {number} [params.activeTimeM]   - Minutes component of time picker
 * @param {number} [params.activeTimeS]   - Seconds component of time picker
 * @param {number} params.activeMiles   - Miles driven while engaged
 * @param {number} params.basePay       - Instacart base pay for the shift
 * @param {number} params.tips          - Customer tips received
 * @param {number} [params.localMinWage=16.50] - Local minimum wage (CA default)
 * @param {number} [params.mileRate=0.37]      - Per-mile reimbursement rate
 *
 * @returns {{
 *   hourlyGuarantee: number,
 *   mileageGuarantee: number,
 *   prop22Floor: number,
 *   adjustmentTopUp: number,
 *   totalShiftEarnings: number,
 *   effectiveHourlyRate: number,
 *   receivedFullGuarantee: boolean,
 * }}
 */
export function calculateProp22({
  activeHours,
  activeTimeH,
  activeTimeM,
  activeTimeS,
  activeMiles,
  basePay,
  tips,
  localMinWage = 16.90,
  mileRate = 0.37,
  includeMiles = false,
}) {
  // Prefer granular time picker values; fall back to legacy decimal field.
  const h = (activeTimeH !== undefined || activeTimeM !== undefined || activeTimeS !== undefined)
    ? convertTimeToDecimal(activeTimeH, activeTimeM, activeTimeS)
    : parseFloat(activeHours) || 0;
  const b = parseFloat(basePay) || 0;
  const t = parseFloat(tips) || 0;
  const w = parseFloat(localMinWage) || 16.90;
  const m = parseFloat(activeMiles) || 0;
  const r = parseFloat(mileRate) || 0.37;

  // Step 1: Hourly portion of the guarantee = hours × (minWage × 1.20)
  const hourlyGuarantee = Math.round(h * (w * 1.20) * 100) / 100;

  // Step 2: Mileage portion of the guarantee = miles × IRS rate
  //         Miles are PART OF the guarantee floor, not a separate line on top.
  //         Prop 22 defines the guarantee as: (hours × rate) + (miles × rate)
  const mileageGuarantee = includeMiles ? Math.round(m * r * 100) / 100 : 0;

  // Step 3: Full guarantee floor = hourly + mileage combined
  //         This is what Instacart compares base pay against.
  const prop22Floor = Math.round((hourlyGuarantee + mileageGuarantee) * 100) / 100;

  // Step 4: Top-up = difference if base pay falls short of the full floor
  //         When basePay >= floor: topUp = 0, total = basePay + tips
  //         When basePay <  floor: topUp fills the gap → total = floor + tips
  //         This is why: hours×$20.28 + miles×$0.37 + tips matches Instacart's payout
  const adjustmentTopUp = Math.round(Math.max(0, prop22Floor - b) * 100) / 100;

  // Step 5: Total = max(basePay, floor) + tips  [miles already embedded in floor, NOT added again]
  const totalShiftEarnings = Math.round((b + adjustmentTopUp + t) * 100) / 100;

  // Derived: effective hourly rate
  const effectiveHourlyRate = h > 0 ? totalShiftEarnings / h : 0;

  // Did base pay already cover the full guarantee floor?
  const receivedFullGuarantee = b >= prop22Floor;

  return {
    hourlyGuarantee,
    mileageGuarantee,
    prop22Floor,
    adjustmentTopUp,
    totalShiftEarnings,
    effectiveHourlyRate,
    receivedFullGuarantee,
  };
}

/**
 * Aggregate multiple shift entries for a month.
 *
 * @param {Array<Object>} entries      - Array of shift objects
 * @param {number} fixedSalary        - Fixed monthly salary (e.g. OMSD $1,830)
 * @param {number} monthlyGoal        - User's target monthly income
 * @param {number} [localMinWage=16.50] - Local minimum wage — MUST match user settings
 * @param {number} [mileRate=0.37]      - Per-mile reimbursement rate — MUST match user settings
 *
 * @returns {{
 *   totalProp22Floors: number,
 *   totalTips: number,
 *   totalAdjustments: number,
 *   totalGigEarnings: number,
 *   grandTotal: number,
 *   remaining: number,
 *   progressPct: number,
 *   shiftCount: number,
 *   avgHourlyRate: number,
 * }}
 */
export function aggregateMonth(
  entries = [],
  fixedSalary = 1830,
  monthlyGoal = 5000,
  localMinWage = 16.90,
  mileRate = 0.37,
  includeMiles = false,
) {
  let totalProp22Floors = 0;
  let totalTips = 0;
  let totalAdjustments = 0;
  let totalHours = 0;
  let totalGigEarnings = 0;
  let totalBase = 0;
  let totalMiles = 0;

  entries.forEach(entry => {
    if (!entry) return;
    const keys = typeof entry === 'object' ? Object.keys(entry).filter(k => k !== 'date' && k !== 'loggedAt') : [];
    const hasNestedPlatform = keys.some(k => typeof entry[k] === 'object' && entry[k] !== null && (entry[k].basePay !== undefined || entry[k].activeTimeH !== undefined || entry[k].activeHours !== undefined || entry[k].tips !== undefined));

    if (hasNestedPlatform) {
      keys.forEach(platId => {
        const platEntry = entry[platId];
        if (!platEntry || typeof platEntry !== 'object') return;
        totalBase += parseFloat(platEntry.basePay) || 0;
        totalTips += Math.round((parseFloat(platEntry.tips) || 0) * 100) / 100;
        totalMiles += parseFloat(platEntry.activeMiles) || 0;
        totalHours += (platEntry.activeTimeH !== undefined || platEntry.activeTimeM !== undefined || platEntry.activeTimeS !== undefined)
          ? convertTimeToDecimal(platEntry.activeTimeH, platEntry.activeTimeM, platEntry.activeTimeS)
          : parseFloat(platEntry.activeHours) || 0;
      });
    } else {
      totalBase += parseFloat(entry.basePay) || 0;
      totalTips += Math.round((parseFloat(entry.tips) || 0) * 100) / 100;
      totalMiles += parseFloat(entry.activeMiles) || 0;
      totalHours += (entry.activeTimeH !== undefined || entry.activeTimeM !== undefined || entry.activeTimeS !== undefined)
        ? convertTimeToDecimal(entry.activeTimeH, entry.activeTimeM, entry.activeTimeS)
        : parseFloat(entry.activeHours) || 0;
    }
  });

  const wageRate = (parseFloat(localMinWage) || 16.90) * 1.20;
  const mRate = parseFloat(mileRate) || 0.37;
  const hourlyGuarantee = totalHours * wageRate;
  const mileageGuarantee = includeMiles ? (totalMiles * mRate) : 0;

  totalProp22Floors = Math.round((hourlyGuarantee + mileageGuarantee) * 100) / 100;
  totalAdjustments = Math.round(Math.max(0, totalProp22Floors - totalBase) * 100) / 100;
  totalGigEarnings = Math.round((totalBase + totalAdjustments + totalTips) * 100) / 100;

  const fSalary = parseFloat(fixedSalary) || 0;
  const mGoal = parseFloat(monthlyGoal) || 5000;

  const grandTotal = fSalary + totalGigEarnings;
  const remaining = Math.max(0, mGoal - grandTotal);
  const progressPct = mGoal > 0 ? Math.min(100, (grandTotal / mGoal) * 100) : 0;
  const avgHourlyRate = totalHours > 0 ? totalGigEarnings / totalHours : 0;

  return {
    totalProp22Floors,
    totalTips,
    totalAdjustments,
    totalGigEarnings,
    grandTotal,
    remaining,
    progressPct,
    shiftCount: entries.length,
    avgHourlyRate,
  };
}

/**
 * Calculates earnings and pay floor guarantees for a date entry.
 * If dayEntry contains multiple gig platform entries (e.g. { instacart: {...}, doordash: {...} }),
 * calculates each platform's guarantee INDEPENDENTLY so base pay from one app never offsets another app's top-up!
 */
export function calculateMultiGigDay(dayEntry, settings = {}) {
  if (!dayEntry) {
    return {
      totalShiftEarnings: 0,
      basePay: 0,
      tips: 0,
      activeHours: 0,
      activeMiles: 0,
      prop22Floor: 0,
      adjustmentTopUp: 0,
      shopperBump: 0,
      platforms: {},
    };
  }

  // Check if dayEntry is a multi-platform object (keys are platform IDs) or single shift
  const keys = Object.keys(dayEntry).filter(k => k !== 'date' && k !== 'loggedAt');
  const hasNestedPlatform = keys.some(k => typeof dayEntry[k] === 'object' && dayEntry[k] !== null && (dayEntry[k].basePay !== undefined || dayEntry[k].activeTimeH !== undefined || dayEntry[k].activeHours !== undefined || dayEntry[k].tips !== undefined));
  const isMulti = hasNestedPlatform || (typeof dayEntry === 'object' && !dayEntry.basePay && keys.length > 0);
  const platformMap = isMulti ? dayEntry : { default: dayEntry };

  let totalBase = 0;
  let totalTips = 0;
  let totalHours = 0;
  let totalMiles = 0;
  let totalFloor = 0;
  let totalTopUp = 0;
  let totalBumps = 0;
  let totalShiftEarnings = 0;

  const platformResults = {};

  Object.entries(platformMap).forEach(([platformId, entry]) => {
    if (platformId === 'date' || platformId === 'loggedAt' || !entry || typeof entry !== 'object') return;
    const calc = calculateProp22({
      ...entry,
      localMinWage: settings.localMinWage,
      mileRate: settings.mileRate,
      includeMiles: settings.includeMiles,
      wageMultiplier: settings.wageMultiplier,
    });

    const bump = parseFloat(entry.shopperBump || entry.bump) || 0;

    totalBase += parseFloat(entry.basePay) || 0;
    totalTips += parseFloat(entry.tips) || 0;
    totalHours += calc.activeHours;
    totalMiles += parseFloat(entry.activeMiles) || 0;
    totalFloor += calc.prop22Floor;
    totalTopUp += calc.adjustmentTopUp;
    totalBumps += bump;
    totalShiftEarnings += (calc.totalShiftEarnings + bump);

    platformResults[platformId] = {
      ...calc,
      shopperBump: bump,
      totalPlatformEarnings: calc.totalShiftEarnings + bump,
    };
  });

  return {
    totalShiftEarnings: Math.round(totalShiftEarnings * 100) / 100,
    basePay: Math.round(totalBase * 100) / 100,
    tips: Math.round(totalTips * 100) / 100,
    activeHours: Math.round(totalHours * 10) / 10,
    activeMiles: Math.round(totalMiles * 10) / 10,
    prop22Floor: Math.round(totalFloor * 100) / 100,
    adjustmentTopUp: Math.round(totalTopUp * 100) / 100,
    shopperBump: Math.round(totalBumps * 100) / 100,
    platforms: platformResults,
  };
}

/**
 * Format a number as USD currency string.
 * @param {number} val
 * @returns {string}
 */
export function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Format a number as a compact dollar amount (e.g. $2.5K).
 * @param {number} val
 * @returns {string}
 */
export function formatCompact(val) {
  if (Math.abs(val) >= 1000) {
    return '$' + (val / 1000).toFixed(1) + 'K';
  }
  return formatCurrency(val);
}

/**
 * Get a YYYY-MM string for a given Date (or today).
 * @param {Date} [date]
 * @returns {string}
 */
export function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Generate mock seed data for the current month.
 * Returns an array of shift entries spread across the first ~15 days.
 */
export function generateSeedData() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Only seed days that have already passed (up to today)
  const maxDay = today.getDate();
  const seedDays = [2, 4, 5, 7, 9, 11, 12, 14, 16, 18].filter(d => d < maxDay);

  // Templates store granular time breakdown for UI repopulation.
  const templates = [
    { activeTimeH: 3, activeTimeM: 30, activeTimeS: 0,  activeMiles: 28, basePay: 42.00, tips: 18.50 },
    { activeTimeH: 4, activeTimeM:  0, activeTimeS: 0,  activeMiles: 35, basePay: 55.00, tips: 22.00 },
    { activeTimeH: 2, activeTimeM: 30, activeTimeS: 0,  activeMiles: 19, basePay: 28.00, tips: 12.75 },
    { activeTimeH: 5, activeTimeM:  0, activeTimeS: 0,  activeMiles: 44, basePay: 68.00, tips: 31.00 },
    { activeTimeH: 3, activeTimeM:  0, activeTimeS: 0,  activeMiles: 24, basePay: 38.50, tips: 15.25 },
    { activeTimeH: 4, activeTimeM: 30, activeTimeS: 0,  activeMiles: 38, basePay: 60.00, tips: 27.50 },
    { activeTimeH: 2, activeTimeM:  0, activeTimeS: 0,  activeMiles: 15, basePay: 22.00, tips:  9.00 },
    { activeTimeH: 6, activeTimeM:  0, activeTimeS: 0,  activeMiles: 52, basePay: 81.00, tips: 38.00 },
    { activeTimeH: 3, activeTimeM: 30, activeTimeS: 15, activeMiles: 30, basePay: 47.00, tips: 20.00 },
    { activeTimeH: 4, activeTimeM:  2, activeTimeS: 45, activeMiles: 34, basePay: 53.00, tips: 24.50 },
  ];

  const entries = {};
  seedDays.forEach((day, i) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tpl = templates[i % templates.length];
    entries[dateStr] = { ...tpl, date: dateStr };
  });

  return entries;
}
