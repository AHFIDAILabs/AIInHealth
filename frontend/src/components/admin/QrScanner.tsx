import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { Camera, SwitchCamera, Square, Upload, AlertCircle, Loader2 } from 'lucide-react';

const ELEMENT_ID = 'checkin-qr-reader';

type Status = 'idle' | 'starting' | 'scanning' | 'error';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
}

// Fully custom chrome around html5-qrcode's low-level Html5Qrcode class — not the
// library's Html5QrcodeScanner "full UI" variant, whose default camera-permission
// button, camera-select dropdown, and "scan an image file" control all render with
// the library's own generic, unstyled markup that clashes with the rest of the
// admin. This still gets the library's built-in shaded scan-region overlay (part
// of the base Html5Qrcode class, not just the full-UI wrapper) — only the
// surrounding buttons/states are hand-built to match the design system.
export const QrScanner = ({ onScan }: QrScannerProps) => {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [fileScanBusy, setFileScanBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const getScanner = () => {
    if (!scannerRef.current) scannerRef.current = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    return scannerRef.current;
  };

  const startWith = async (cameraIdOrConstraints: string | MediaTrackConstraints) => {
    const scanner = getScanner();
    await scanner.start(
      cameraIdOrConstraints,
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => onScanRef.current(decodedText),
      () => {} // per-frame decode misses are expected while no code is in view — not an error
    );
  };

  const start = async () => {
    setStatus('starting');
    setErrorMessage('');
    try {
      // facingMode picks a sensible default (rear camera on mobile) in one step,
      // rather than forcing a camera-picker before the very first scan.
      await startWith({ facingMode: 'environment' });
      setStatus('scanning');
      // Enumerate cameras only after permission is already granted — calling this
      // first would itself trigger a second, redundant permission prompt on some
      // browsers.
      Html5Qrcode.getCameras()
        .then(setCameras)
        .catch(() => {});
    } catch (err) {
      setStatus('error');
      const name = (err as { name?: string })?.name;
      setErrorMessage(
        name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera access in your browser settings, then try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : 'Could not start the camera. Try again, or use the image upload option below.'
      );
    }
  };

  const stop = async () => {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    setStatus('idle');
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (activeCameraIndex + 1) % cameras.length;
    const scanner = getScanner();
    if (scanner.isScanning) await scanner.stop().catch(() => {});
    setActiveCameraIndex(nextIndex);
    try {
      await startWith(cameras[nextIndex].id);
      setStatus('scanning');
    } catch {
      setStatus('error');
      setErrorMessage('Could not switch cameras.');
    }
  };

  const scanFile = async (file: File) => {
    setFileScanBusy(true);
    try {
      const scanner = getScanner();
      // Decoding an image doesn't need the live camera running — pause it first if
      // it happens to be active, so the two don't fight over the same element.
      if (scanner.isScanning) await scanner.stop().catch(() => {});
      const decodedText = await scanner.scanFile(file, false);
      onScanRef.current(decodedText);
      setStatus('idle');
    } catch {
      setErrorMessage('Could not read a QR code from that image.');
      setStatus('error');
    } finally {
      setFileScanBusy(false);
    }
  };

  // Stop the camera if the admin navigates away mid-scan — not a StrictMode
  // double-invoke concern here (unlike the old auto-start-on-mount version) since
  // starting only ever happens from a deliberate click, never from this effect.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div>
      {/* This box's size must stay stable and non-zero at all times, including
          before scanning starts — html5-qrcode measures #checkin-qr-reader's
          rendered width the moment .start() is called and bakes that measurement
          into the <video>'s inline style permanently. Toggling this box's own
          visibility (display:none) based on status would make that measurement
          happen against a collapsed 0×0 box, leaving the video permanently sized
          at 0 even once "scanning" flips true. So the scanner element is always
          present at a fixed aspect ratio; the idle/starting/error states render
          as an overlay on top of it instead of replacing it. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-navy [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover">
        <div id={ELEMENT_ID} className="absolute inset-0" />

        {status === 'idle' && (
          <button
            onClick={start}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-offwhite text-center transition-colors hover:bg-orange/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-secondary text-orange">
              <Camera size={22} />
            </span>
            <span className="font-display text-sm font-semibold text-navy">Start Camera Scanner</span>
            <span className="max-w-[220px] text-xs text-slate-500">
              You&rsquo;ll be asked to allow camera access — needed to scan e-ticket QR codes.
            </span>
          </button>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-offwhite text-center">
            <Loader2 size={26} className="animate-spin text-orange" />
            <span className="text-sm font-medium text-slate-500">Requesting camera access…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-danger/5 px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertCircle size={20} />
            </span>
            <p className="max-w-[260px] text-sm font-medium text-danger">{errorMessage}</p>
            <button
              onClick={start}
              className="rounded-full bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange-hover"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {status === 'scanning' && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Hold a QR e-ticket steady inside the frame.</p>
          <div className="flex shrink-0 items-center gap-2">
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                title="Switch camera"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-orange/40 hover:text-orange"
              >
                <SwitchCamera size={15} />
              </button>
            )}
            <button
              onClick={stop}
              title="Stop scanner"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-danger/40 hover:text-danger"
            >
              <Square size={13} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={fileScanBusy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-orange/40 hover:text-orange disabled:opacity-60"
        >
          {fileScanBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {fileScanBusy ? 'Reading image…' : 'Or upload a QR code image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) scanFile(file);
          }}
        />
      </div>
    </div>
  );
};
