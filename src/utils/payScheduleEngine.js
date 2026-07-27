/**
 * EvryTrack Pay Schedule & Payday Calendar Engine
 * Calculates W-2 paycheck dates (Monthly, Bi-Weekly, Weekly, Semi-Monthly)
 * Handles short months (e.g. Feb 28/29), leap years, and 14-day / 7-day recurring pay schedules.
 */

// Helper to get total days in a given month (1-indexed month 1-12)
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates whether a specific date (dateStr: YYYY-MM-DD) is a Payday according to user settings.
 */
export function isPaydayDate(dateStr, settings = {}) {
  if (!dateStr || settings.workType === 'gig_only') return false;

  const freq = settings.payFrequency || 'monthly';
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return false;

  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth() + 1; // 1-12
  const targetDay = target.getDate();

  // 1. MONTHLY PAY SCHEDULE
  if (freq === 'monthly') {
    const desiredDay = parseInt(settings.paydayOfMonth || 1, 10);
    const maxDays = getDaysInMonth(targetYear, targetMonth);
    const actualPayday = Math.min(desiredDay, maxDays);

    return targetDay === actualPayday;
  }

  // 2. SEMI-MONTHLY PAY SCHEDULE (e.g. 1st & 15th, or 15th & Last Day)
  if (freq === 'semimonthly') {
    const day1 = parseInt(settings.paydaySemi1 || 1, 10);
    const day2 = parseInt(settings.paydaySemi2 || 15, 10);
    const maxDays = getDaysInMonth(targetYear, targetMonth);

    const actualDay1 = Math.min(day1, maxDays);
    const actualDay2 = Math.min(day2, maxDays);

    return targetDay === actualDay1 || targetDay === actualDay2;
  }

  // 3. BI-WEEKLY (Every 14 Days) or WEEKLY (Every 7 Days)
  if (freq === 'biweekly' || freq === 'weekly') {
    const anchorStr = settings.nextPaydayDate || new Date().toISOString().split('T')[0];
    const anchor = new Date(anchorStr + 'T00:00:00');
    if (isNaN(anchor.getTime())) return false;

    const intervalDays = freq === 'biweekly' ? 14 : 7;
    const diffMs = target.getTime() - anchor.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays % intervalDays === 0;
  }

  return false;
}

/**
 * Gets the Next Expected Payday date and days remaining count from current date.
 */
export function getNextPaydayInfo(settings = {}, referenceDate = new Date()) {
  if (settings.workType === 'gig_only') return null;

  const freq = settings.payFrequency || 'monthly';
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  let nextPayday = null;

  if (freq === 'monthly') {
    const desiredDay = parseInt(settings.paydayOfMonth || 1, 10);
    let y = today.getFullYear();
    let m = today.getMonth() + 1;

    let maxDays = getDaysInMonth(y, m);
    let candidate = new Date(y, m - 1, Math.min(desiredDay, maxDays));

    if (candidate < today) {
      // Next month
      m++;
      if (m > 12) { m = 1; y++; }
      maxDays = getDaysInMonth(y, m);
      candidate = new Date(y, m - 1, Math.min(desiredDay, maxDays));
    }
    nextPayday = candidate;
  } else if (freq === 'biweekly' || freq === 'weekly') {
    const interval = freq === 'biweekly' ? 14 : 7;
    const anchorStr = settings.nextPaydayDate || today.toISOString().split('T')[0];
    let anchor = new Date(anchorStr + 'T00:00:00');

    if (isNaN(anchor.getTime())) anchor = new Date(today);

    // Step forward/backward in interval steps to find next upcoming payday
    while (anchor < today) {
      anchor.setDate(anchor.getDate() + interval);
    }
    nextPayday = anchor;
  } else if (freq === 'semimonthly') {
    const day1 = parseInt(settings.paydaySemi1 || 1, 10);
    const day2 = parseInt(settings.paydaySemi2 || 15, 10);

    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    let maxDays = getDaysInMonth(y, m);

    let d1 = new Date(y, m - 1, Math.min(day1, maxDays));
    let d2 = new Date(y, m - 1, Math.min(day2, maxDays));

    if (d1 >= today && d2 >= today) {
      nextPayday = d1 < d2 ? d1 : d2;
    } else if (d1 >= today) {
      nextPayday = d1;
    } else if (d2 >= today) {
      nextPayday = d2;
    } else {
      // Next month
      m++;
      if (m > 12) { m = 1; y++; }
      maxDays = getDaysInMonth(y, m);
      d1 = new Date(y, m - 1, Math.min(day1, maxDays));
      d2 = new Date(y, m - 1, Math.min(day2, maxDays));
      nextPayday = d1 < d2 ? d1 : d2;
    }
  }

  if (!nextPayday) return null;

  const diffMs = nextPayday.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const dateStr = nextPayday.toISOString().split('T')[0];
  const formattedDate = nextPayday.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    dateStr,
    formattedDate,
    daysRemaining,
    paycheckAmount: parseFloat(settings.salaryAmount ?? settings.fixedSalary) || 0,
  };
}
