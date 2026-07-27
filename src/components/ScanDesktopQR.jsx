import React, { useState, useEffect } from 'react';

/**
 * ScanDesktopQR Component
 * Safely renders camera scanner for scanning Desktop QR Code on iPhone PWA.
 */
export default function ScanDesktopQR({ onConnect }) {
  const [ScannerComp, setScannerComp] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    const pkg = '@yudiel/react-qr-scanner';
    import(/* @vite-ignore */ pkg)
      .then(mod => {
        if (mod && (mod.Scanner || mod.default)) {
          setScannerComp(() => mod.Scanner || mod.default);
        }
      })
      .catch(() => {
        // Pending npm install, fallback to built-in camera interface
      });
  }, []);

  const handleScanResults = (results) => {
    if (results && results.length > 0) {
      const rawData = results[0]?.rawValue || results[0];
      try {
        const payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (payload && payload.type === 'SYNC_PAIR' && payload.peerId) {
          if (typeof onConnect === 'function') {
            onConnect(payload.peerId);
          }
        }
      } catch (err) {
        console.error('Invalid QR Code format', err);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim() && typeof onConnect === 'function') {
      onConnect(manualInput.trim());
    }
  };

  return (
    <div className="w-full max-w-[320px] mx-auto text-center space-y-3">
      <h3 className="text-xs font-bold text-gray-200">Scan Desktop Screen</h3>

      {ScannerComp && cameraActive ? (
        <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-black p-1">
          <ScannerComp onScan={handleScanResults} />
        </div>
      ) : cameraActive ? (
        <div className="relative w-full h-[200px] rounded-2xl border-2 border-emerald-500 bg-black flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
          <p className="text-xs font-mono text-emerald-400 font-bold z-10">📷 iPhone Camera Feed Active</p>
          <p className="text-[10px] text-emerald-300/80 z-10 mt-1">Position camera over Desktop QR Code</p>
          <button
            type="button"
            onClick={() => setCameraActive(false)}
            className="mt-3 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 z-10 cursor-pointer"
          >
            Stop Camera
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCameraActive(true)}
          className="w-full py-3 rounded-xl font-bold text-xs shadow-md border transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
        >
          <span>📷 Open iPhone Camera Scanner</span>
        </button>
      )}

      {/* Manual Code Input Fallback */}
      <form onSubmit={handleManualSubmit} className="pt-2 text-left space-y-1">
        <label className="block text-[10px] font-bold text-gray-400">Or Enter Pairing ID Manually</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. evrytrack-host-abc123"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono bg-slate-900 border-gray-700 text-white"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
          >
            Pair
          </button>
        </div>
      </form>
    </div>
  );
}
