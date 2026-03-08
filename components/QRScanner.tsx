'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onScan: (qrCode: string) => void;
  onError?: (msg: string) => void;
  active?: boolean;
}

/**
 * QR scanner component.
 * Uses the native BarcodeDetector API when available (Chrome/Edge),
 * falls back to jsQR for Firefox/Safari.
 */
export default function QRScanner({ onScan, onError, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanLoop();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      onError?.(msg);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    try {
      let result: string | null = null;

      // Try native BarcodeDetector first
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(canvas);
        if (codes.length > 0) result = codes[0].rawValue;
      } else {
        // Fallback: jsQR (dynamically imported so it doesn't bloat the bundle)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) result = code.data;
      }

      if (result && result !== lastScannedRef.current) {
        lastScannedRef.current = result;
        onScan(result);
        // Debounce: reset after 2s so same code can be re-scanned if needed
        setTimeout(() => { lastScannedRef.current = ''; }, 2000);
      }
    } catch {
      // ignore detection errors
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan]);

  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [active, startCamera, stopCamera]);

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-100 aspect-video text-center px-6 py-10">
        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.867V15.133a1 1 0 01-1.447.902L15 14M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
        </svg>
        <p className="text-sm font-semibold text-gray-600 mb-1">Camera unavailable</p>
        <p className="text-xs text-gray-400">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      {/* Scan frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 relative">
          {/* Corner markers */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
            <div
              key={pos}
              className={`absolute w-8 h-8 ${pos} border-[3px] border-white rounded-sm opacity-80`}
              style={{
                borderRight: pos.includes('left') ? 'none' : undefined,
                borderLeft: pos.includes('right') ? 'none' : undefined,
                borderBottom: pos.includes('top') ? 'none' : undefined,
                borderTop: pos.includes('bottom') ? 'none' : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs opacity-70">
        Point camera at QR code
      </p>
    </div>
  );
}
