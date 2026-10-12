import { useCallback, useEffect, useRef, useState } from 'react';
import { runAudioJob, buffersToChannels } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100 } from '../lib/audio';

export type SepPhase = 'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error';

export interface SeparatedStems {
  vocals: [Float32Array, Float32Array];
  drums: [Float32Array, Float32Array];
  bass: [Float32Array, Float32Array];
  other: [Float32Array, Float32Array];
  sampleRate: number;
  // convenience mixes
  instrumental: [Float32Array, Float32Array]; // drums+bass+other
  music: [Float32Array, Float32Array]; // drums+bass
}

/** Shared upload -> separate -> stems flow for all separation-based tools. */
export function useSeparation() {
  const [phase, setPhase] = useState<SepPhase>('idle');
  const [fileName, setFileName] = useState('');
  const [durationSec, setDurationSec] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [stems, setStems] = useState<SeparatedStems | null>(null);
  const [original, setOriginal] = useState<[Float32Array, Float32Array] | null>(null);
  const jobRef = useRef<{ cancel: () => void } | null>(null);
  const audioRef = useRef<{ left: Float32Array; right: Float32Array } | null>(null);

  useEffect(() => () => jobRef.current?.cancel(), []);

  const loadFile = useCallback(async (file: File) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      const { left, right, sampleRate, duration } = await decodeAudioFile(file);
      setDurationSec(duration);
      const [rL, rR] = await resampleTo44100(left, right, sampleRate);
      audioRef.current = { left: rL, right: rR };
      setOriginal([rL.slice(), rR.slice()]);
      setPhase('ready');
    } catch {
      setError('Could not read that file. Try MP3, WAV, M4A or MP4.');
      setPhase('error');
    }
  }, []);

  const separate = useCallback((mode: 'ai' | 'fast') => {
    const audio = audioRef.current;
    if (!audio) return;
    setPhase('processing');
    setProgress(0);
    const job = runAudioJob(
      mode === 'ai' ? 'separate' : 'separateFast',
      { left: audio.left.slice(), right: audio.right.slice() },
      (f, label) => { setProgress(f); setProgressLabel(label); },
    );
    jobRef.current = job;
    job.promise.then(
      (result) => {
        if (result.kind === 'audio') {
          setError('Unexpected result from audio worker.');
          setPhase('error');
          return;
        }
        const sr = result.sampleRate ?? 44100;
        let s: SeparatedStems;
        if (result.kind === 'stemsFast') {
          const vocals = buffersToChannels(result.stems.vocals);
          const music = buffersToChannels(result.stems.music);
          const n = vocals[0].length;
          const silent: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
          s = { vocals, drums: music, bass: silent, other: silent, sampleRate: sr, instrumental: music, music };
        } else {
          const get = (n: string): [Float32Array, Float32Array] => buffersToChannels(result.stems[n]);
          const vocals = get('vocals'), drums = get('drums'), bass = get('bass'), other = get('other');
          const mix = (a: [Float32Array, Float32Array], b: [Float32Array, Float32Array]): [Float32Array, Float32Array] => {
            const L = new Float32Array(a[0].length), R = new Float32Array(a[0].length);
            for (let i = 0; i < L.length; i++) { L[i] = a[0][i] + b[0][i]; R[i] = a[1][i] + b[1][i]; }
            return [L, R];
          };
          s = { vocals, drums, bass, other, sampleRate: sr, instrumental: mix(mix(drums, bass), other), music: mix(drums, bass) };
        }
        setStems(s);
        setPhase('done');
      },
      (err) => {
        if ((err as DOMException).name === 'AbortError') { setPhase('ready'); return; }
        setError(`Separation failed: ${(err as Error).message}`);
        setPhase('error');
      },
    );
  }, []);

  const cancel = useCallback(() => jobRef.current?.cancel(), []);

  const reset = useCallback(() => {
    jobRef.current?.cancel();
    setPhase('idle');
    setStems(null);
    setOriginal(null);
    setError('');
    audioRef.current = null;
  }, []);

  return { phase, fileName, durationSec, progress, progressLabel, error, stems, original, loadFile, separate, cancel, reset };
}
