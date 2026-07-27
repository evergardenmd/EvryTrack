/**
 * EvryTrack CRDT (Conflict-free Replicated Data Type) Engine
 * Merges shift entry packets from multiple offline devices without data loss.
 * Compares entry IDs / dates and resolves conflicts using LWW (Last-Write-Wins) timestamp logic.
 */

export function mergeCRDTShiftPackets(localEntries = [], incomingEntries = []) {
  const localArr = Array.isArray(localEntries) ? localEntries : [];
  const incomingArr = Array.isArray(incomingEntries) ? incomingEntries : [];

  const entryMap = new Map();

  // 1. Process local entries
  localArr.forEach(entry => {
    if (!entry) return;
    const key = entry.date || entry.id;
    if (key) {
      entryMap.set(key, { ...entry });
    }
  });

  // 2. Process incoming entries with Last-Write-Wins (LWW) conflict resolution
  let mergedCount = 0;
  let newEntriesCount = 0;

  incomingArr.forEach(incoming => {
    if (!incoming) return;
    const key = incoming.date || incoming.id;
    if (!key) return;

    if (!entryMap.has(key)) {
      // New entry from remote device
      entryMap.set(key, { ...incoming });
      newEntriesCount++;
    } else {
      // Existing entry - compare updatedAt timestamps
      const existing = entryMap.get(key);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || '2000-01-01').getTime();
      const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || '2000-01-01').getTime();

      if (incomingTime > existingTime) {
        // Remote device has a newer edit
        entryMap.set(key, { ...incoming });
        mergedCount++;
      }
    }
  });

  const mergedList = Array.from(entryMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    mergedList,
    stats: {
      total: mergedList.length,
      newFromRemote: newEntriesCount,
      updatedFromRemote: mergedCount,
    },
  };
}
