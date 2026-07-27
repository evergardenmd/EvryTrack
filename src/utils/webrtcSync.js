/**
 * EvryTrack WebRTC P2P Direct Local Network Sync Engine
 * Connects Desktop app (Host/Receiver) and iPhone PWA (Client/Sender) directly over WebRTC.
 * Zero cloud servers store user data.
 */

import { mergeYjsShiftState } from './yjsSyncEngine';
import { getAllShiftEntriesFromStorage, saveAllImportedEntriesToStorage } from './syncEngine';

let activePeer = null;

// Dynamically load PeerJS SDK
export function loadPeerJSSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('No window available');
    if (window.Peer) return resolve(window.Peer);

    if (document.getElementById('peerjs-sdk-script')) {
      // Script already added, wait for load
      const existing = document.getElementById('peerjs-sdk-script');
      existing.addEventListener('load', () => resolve(window.Peer));
      existing.addEventListener('error', () => reject('Failed to load PeerJS SDK'));
      return;
    }

    const script = document.createElement('script');
    script.id = 'peerjs-sdk-script';
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.async = true;
    script.onload = () => {
      console.log('🟢 PeerJS WebRTC SDK Loaded');
      resolve(window.Peer);
    };
    script.onerror = (err) => {
      console.warn('⚠️ PeerJS CDN script failed to load, initializing WebRTC fallback mode.');
      reject(err);
    };
    document.body.appendChild(script);
  });
}

// Generate random short pairing code (e.g. EVR-7829)
export function generateShortPairId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EVR-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── 1. HOST MODE (Desktop / Receiver) ───────────────────────────────────────
export async function startPeerHost(onPeerReady, onDataReceived, onError) {
  try {
    const PeerSDK = await loadPeerJSSdk();
    if (activePeer) {
      activePeer.destroy();
    }

    const hostId = 'evrytrack-host-' + Math.random().toString(36).substring(2, 8);
    activePeer = new PeerSDK(hostId, {
      debug: 1,
    });

    activePeer.on('open', (id) => {
      console.log('🟢 WebRTC Host Listening. Peer ID:', id);
      if (typeof onPeerReady === 'function') onPeerReady(id);
    });

    activePeer.on('connection', (conn) => {
      console.log('🔗 Incoming P2P connection from device:', conn.peer);

      conn.on('data', (incomingPacket) => {
        console.log('📥 Received P2P shift packet:', incomingPacket);

        try {
          const localEntries = getAllShiftEntriesFromStorage();
          const incomingEntries = Array.isArray(incomingPacket?.entries) ? incomingPacket.entries : [];
          
          // Apply Yjs CRDT Conflict Resolution
          const mergedList = mergeYjsShiftState(localEntries, incomingEntries);

          // Save merged data to LocalStorage
          saveAllImportedEntriesToStorage(mergedList);

          const stats = {
            total: mergedList.length,
            newFromRemote: Math.max(0, mergedList.length - localEntries.length),
            updatedFromRemote: incomingEntries.length,
          };

          // Respond back to sender with updated merged data
          conn.send({
            type: 'SYNC_RESPONSE',
            success: true,
            entries: mergedList,
            stats,
            timestamp: new Date().toISOString(),
          });

          if (typeof onDataReceived === 'function') {
            onDataReceived({ mergedList, stats });
          }
        } catch (err) {
          console.error('Error processing WebRTC packet:', err);
        }
      });
    });

    activePeer.on('error', (err) => {
      console.warn('WebRTC Peer Host error:', err);
      if (typeof onError === 'function') onError(err?.message || 'P2P Connection Error');
    });

    return activePeer;
  } catch (err) {
    if (typeof onError === 'function') onError('WebRTC SDK load error');
  }
}

// ── 2. CLIENT MODE (iPhone / Sender) ───────────────────────────────────────
export async function connectToPeerHost(targetPeerId, onSyncComplete, onError) {
  try {
    const PeerSDK = await loadPeerJSSdk();
    const clientPeer = new PeerSDK();

    clientPeer.on('open', () => {
      console.log('Connecting to P2P Host:', targetPeerId);
      const conn = clientPeer.connect(targetPeerId);

      conn.on('open', () => {
        console.log('🟢 WebRTC DataChannel Opened! Sending shift ledger...');
        const localEntries = getAllShiftEntriesFromStorage();

        // Send local shift packet
        conn.send({
          type: 'SYNC_REQUEST',
          entries: localEntries,
          timestamp: new Date().toISOString(),
        });
      });

      conn.on('data', (responsePacket) => {
        console.log('📥 Received SYNC_RESPONSE from Host:', responsePacket);

        if (responsePacket?.success && Array.isArray(responsePacket?.entries)) {
          // Update local state with Host's CRDT merged response
          saveAllImportedEntriesToStorage(responsePacket.entries);

          if (typeof onSyncComplete === 'function') {
            onSyncComplete(responsePacket);
          }
        }
      });

      conn.on('error', (err) => {
        if (typeof onError === 'function') onError(err?.message || 'Connection failed');
      });
    });

    clientPeer.on('error', (err) => {
      if (typeof onError === 'function') onError(err?.message || 'P2P Target error');
    });
  } catch (err) {
    if (typeof onError === 'function') onError('WebRTC Client error');
  }
}

// Destroy active peer instance
export function stopPeerSync() {
  if (activePeer) {
    activePeer.destroy();
    activePeer = null;
  }
}
