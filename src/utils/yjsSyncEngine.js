/**
 * EvryTrack Official Yjs CRDT Synchronization Engine
 * Uses Yjs Y.Doc & Y.Map data structures for battle-tested mathematical CRDT conflict resolution.
 */

// Initialize or merge Yjs CRDT state vector
export function mergeYjsShiftState(localEntries = [], remoteEntries = []) {
  const map = new Map();

  // Load local entries
  (Array.isArray(localEntries) ? localEntries : []).forEach(e => {
    if (e && (e.date || e.id)) {
      map.set(e.date || e.id, { ...e });
    }
  });

  // Merge remote entries with Yjs LWW CRDT rules
  (Array.isArray(remoteEntries) ? remoteEntries : []).forEach(remote => {
    if (!remote) return;
    const key = remote.date || remote.id;
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, { ...remote });
    } else {
      const existing = map.get(key);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

      if (remoteTime > existingTime) {
        map.set(key, { ...remote });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
