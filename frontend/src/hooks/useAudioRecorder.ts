import { useCallback, useRef, useState } from 'react';

// Picks whatever mime type the browser's MediaRecorder actually supports —
// Chrome/Firefox default to webm, Safari to mp4. Falls through to letting the
// browser pick its own default if none of these report as supported (still
// works, just without an explicit mimeType hint).
const PREFERRED_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg'];
const pickMimeType = (): string | undefined =>
  PREFERRED_MIME_TYPES.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t));

interface UseAudioRecorderOptions {
  maxDurationSec?: number;
}

// Thin MediaRecorder + getUserMedia wrapper shared by Layer 2's "Capture This
// Quote" (one clip at a time) and Layer 3's continuous live-transcript loop
// (the caller just calls start() again immediately after each stop()
// resolves — this hook has no notion of "continuous", that's the caller's
// loop). Requests mic permission fresh on every start() rather than holding
// the stream open indefinitely, so a user who's stepped away and revoked
// permission gets a clear error on their next attempt instead of a silent
// failure.
export const useAudioRecorder = (options: UseAudioRecorderOptions = {}) => {
  const maxDurationSec = options.maxDurationSec ?? 45;
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: pickMimeType() }));
        cleanup();
        return;
      }
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, [cleanup]);

  const start = useCallback(async (): Promise<void> => {
    setError('');
    setElapsedSec(0);
    chunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stopResolveRef.current?.(blob);
        stopResolveRef.current = null;
        cleanup();
      };

      recorder.start();
      setRecording(true);

      elapsedTimerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
      autoStopTimerRef.current = setTimeout(() => {
        void stop();
      }, maxDurationSec * 1000);
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  }, [cleanup, maxDurationSec, stop]);

  return { recording, start, stop, elapsedSec, error };
};
