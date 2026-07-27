/**
 * EvryTrack Comprehensive Sync Engine
 * Handles 1-click all-time backup exports, JSON imports across all months, schema validation, and device sync helpers.
 */

// Gather all shift entries across ALL months & years stored in LocalStorage
export function getAllShiftEntriesFromStorage() {
  const allEntries = [];
  if (typeof window === 'undefined') return allEntries;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gigtrack_shifts_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              Object.values(parsed).forEach(entry => {
                if (entry && (entry.date || entry.hours || entry.netPay || entry.miles || entry.basePay)) {
                  allEntries.push(entry);
                }
              });
            }
          }
        } catch (e) {
          console.warn('Failed to parse key:', key, e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to read LocalStorage keys:', err);
  }

  // Sort chronologically by date
  return allEntries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

// Write imported entries into their corresponding monthly LocalStorage buckets (gigtrack_shifts_YYYY-MM)
export function saveAllImportedEntriesToStorage(importedEntries = []) {
  if (!Array.isArray(importedEntries) || importedEntries.length === 0) return 0;

  const monthBuckets = {};

  importedEntries.forEach(entry => {
    if (!entry) return;
    const dateStr = entry.date || new Date().toISOString().split('T')[0];
    const monthKey = dateStr.slice(0, 7); // "YYYY-MM"
    const storageKey = `gigtrack_shifts_${monthKey}`;

    if (!monthBuckets[storageKey]) {
      try {
        const raw = localStorage.getItem(storageKey);
        monthBuckets[storageKey] = raw ? JSON.parse(raw) : {};
      } catch {
        monthBuckets[storageKey] = {};
      }
    }

    monthBuckets[storageKey][dateStr] = {
      ...entry,
      date: dateStr,
    };
  });

  // Write each month bucket back into LocalStorage
  Object.entries(monthBuckets).forEach(([key, bucketObj]) => {
    try {
      localStorage.setItem(key, JSON.stringify(bucketObj));
    } catch (e) {
      console.error('Failed to write storage key:', key, e);
    }
  });

  return importedEntries.length;
}

// Export full all-time backup as .json file containing ALL shift entries, settings, W-2 profiles, gig apps, and bank deposit overrides
export function exportBackupData(providedEntries = [], settings = {}) {
  try {
    // Collect all-time shift entries across all months
    const allTimeEntries = getAllShiftEntriesFromStorage();
    const finalEntries = allTimeEntries.length > 0 ? allTimeEntries : (Array.isArray(providedEntries) ? providedEntries : []);

    let actualW2 = {};
    let actualGig = {};
    try {
      actualW2 = JSON.parse(localStorage.getItem('gigtrack_actual_w2')) || settings?.actualW2Paychecks || {};
    } catch {}
    try {
      actualGig = JSON.parse(localStorage.getItem('gigtrack_actual_payouts')) || settings?.actualPaychecks || {};
    } catch {}

    const backupObj = {
      app: 'EvryTrack',
      version: '1.0.0-beta',
      exportDate: new Date().toISOString(),
      totalShifts: finalEntries.length,
      settings: settings || {},
      actualW2Paychecks: actualW2,
      actualPaychecks: actualGig,
      entries: finalEntries,
    };

    const dataStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `EvryTrack_Backup_All_Time_${dateStamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: finalEntries.length };
  } catch (err) {
    console.error('Failed to export backup:', err);
    return { success: false, error: err.message };
  }
}

// Import backup from JSON / .evrytrack file
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const json = JSON.parse(text);

        // Validation: support EvryTrack backup structure OR generic entries array
        if (!json || typeof json !== 'object') {
          return reject(new Error('Invalid backup file structure. Content must be valid JSON.'));
        }

        const entries = Array.isArray(json.entries)
          ? json.entries
          : (Array.isArray(json) ? json : []);

        const settings = json.settings && typeof json.settings === 'object' ? json.settings : {};
        const actualW2Paychecks = json.actualW2Paychecks || settings.actualW2Paychecks || {};
        const actualPaychecks = json.actualPaychecks || settings.actualPaychecks || {};

        resolve({
          entries,
          settings,
          actualW2Paychecks,
          actualPaychecks,
          exportDate: json.exportDate || null,
          version: json.version || '1.0.0',
        });
      } catch (err) {
        reject(new Error('Failed to parse backup file. Please ensure it is a valid EvryTrack backup JSON file.'));
      }
    };

    reader.onerror = () => reject(new Error('Error reading backup file.'));
    reader.readAsText(file);
  });
}

// Generate 6-digit Device Pairing PIN
export function generatePairingPin() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = 'EVR-';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}
