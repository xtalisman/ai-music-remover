/* Audio Web Worker: all heavy processing runs here so the UI never freezes.
   Job protocol:
     main -> worker: { type: 'job', id, jobType, payload }
     main -> worker: { type: 'cancel', id }
     worker -> main: { type: 'progress', id, fraction, label }
     worker -> main: { type: 'result', id, result, transfer?: ArrayBuffer[] }
     worker -> main: { type: 'error', id, message }
*/
import { separateAudio, separateFast, TARGET_SR, type StemName } from './separator';
import { pitchShift, timeStretch } from './pitch';

export type VoiceFxPreset = 'deep' | 'high' | 'chipmunk' | 'robot' | 'echo' | 'cave';

export type JobType = 'separate' | 'separateFast' | 'pitchShift' | 'timeStretch' | 'voiceFx' | 'denoise';

interface JobMessage {
  type: 'job';
  id: string;
  jobType: JobType;
  payload: {
    left?: Float32Array;
    right?: Float32Array;
    sampleRate?: number;
    semitones?: number;
    rate?: number;
    preset?: VoiceFxPreset;
    intensity?: number; // denoise 0..1
  };
}

const abortControllers = new Map<string, AbortController>();

function postProgress(id: string, fraction: number, label: string): void {
  self.postMessage({ type: 'progress', id, fraction, label });
}

async function runSeparate(
  id: string, left: Float32Array, right: Float32Array, signal: AbortSignal,
): Promise<void> {
  const stems = await separateAudio(
    left, right,
    (fraction, label) => postProgress(id, fraction, label),
    signal,
  );
  const transfer: ArrayBuffer[] = [];
  const out: Record<string, [ArrayBuffer, ArrayBuffer]> = {};
  (Object.keys(stems) as StemName[]).forEach((s) => {
    const [l, r] = stems[s];
    out[s] = [l.buffer as ArrayBuffer, r.buffer as ArrayBuffer];
    transfer.push(l.buffer as ArrayBuffer, r.buffer as ArrayBuffer);
  });
  self.postMessage(
    { type: 'result', id, result: { kind: 'stems', sampleRate: TARGET_SR, stems: out } },
    { transfer },
  );
}

function runSeparateFast(id: string, left: Float32Array, right: Float32Array): void {
  postProgress(id, 0.5, 'Separating (instant mode)…');
  const { vocals, music } = separateFast(left, right);
  postProgress(id, 1, 'Done');
  const transfer = [
    vocals[0].buffer as ArrayBuffer, vocals[1].buffer as ArrayBuffer,
    music[0].buffer as ArrayBuffer, music[1].buffer as ArrayBuffer,
  ];
  self.postMessage(
    {
      type: 'result',
      id,
      result: {
        kind: 'stemsFast',
        stems: {
          vocals: [vocals[0].buffer, vocals[1].buffer],
          music: [music[0].buffer, music[1].buffer],
        },
      },
    },
    { transfer },
  );
}

async function runPitchTime(
  id: string,
  jobType: 'pitchShift' | 'timeStretch',
  payload: JobMessage['payload'],
  signal: AbortSignal,
): Promise<void> {
  const { left, right } = payload;
  if (!left || !right) throw new Error('missing audio data');
  postProgress(id, 0.1, jobType === 'pitchShift' ? 'Shifting pitch…' : 'Changing tempo…');
  // process in one go (phase vocoder is chunked internally by frames)
  const outL = jobType === 'pitchShift'
    ? pitchShift(left, payload.semitones ?? 0)
    : timeStretch(left, payload.rate ?? 1);
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 0.55, jobType === 'pitchShift' ? 'Shifting pitch…' : 'Changing tempo…');
  const outR = jobType === 'pitchShift'
    ? pitchShift(right, payload.semitones ?? 0)
    : timeStretch(right, payload.rate ?? 1);
  postProgress(id, 1, 'Done');
  self.postMessage(
    { type: 'result', id, result: { kind: 'audio', left: outL.buffer, right: outR.buffer } },
    { transfer: [outL.buffer as ArrayBuffer, outR.buffer as ArrayBuffer] },
  );
}

/** Simple DSP voice effects (mono-compatible, applied per channel). */
function applyVoiceFx(x: Float32Array, sampleRate: number, preset: VoiceFxPreset): Float32Array {
  const n = x.length;
  const y = new Float32Array(n);
  if (preset === 'deep') return pitchShift(x, -7);
  if (preset === 'high') return pitchShift(x, 7);
  if (preset === 'chipmunk') return pitchShift(x, 12);
  if (preset === 'robot') {
    // ring modulation at 30Hz + slight metallic edge
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      y[i] = x[i] * Math.sin(2 * Math.PI * 30 * t) * 1.4;
    }
    return y;
  }
  if (preset === 'echo') {
    const d = Math.floor(sampleRate * 0.28);
    for (let i = 0; i < n; i++) {
      y[i] = x[i] + (i >= d ? y[i - d] * 0.45 : 0) + (i >= d * 2 ? x[i - d * 2] * 0.2 : 0);
    }
    return y;
  }
  // cave: slapback cluster for a roomy feel
  const d1 = Math.floor(sampleRate * 0.09), d2 = Math.floor(sampleRate * 0.17), d3 = Math.floor(sampleRate * 0.29);
  for (let i = 0; i < n; i++) {
    y[i] = x[i]
      + (i >= d1 ? x[i - d1] * 0.35 : 0)
      + (i >= d2 ? x[i - d2] * 0.25 : 0)
      + (i >= d3 ? x[i - d3] * 0.15 : 0);
  }
  // normalize
  let pk = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(y[i]); if (a > pk) pk = a; }
  if (pk > 1) for (let i = 0; i < n; i++) y[i] /= pk;
  return y;
}

async function runVoiceFx(
  id: string, payload: JobMessage['payload'], signal: AbortSignal,
): Promise<void> {
  const { left, right, preset } = payload;
  if (!left || !right || !preset) throw new Error('missing audio/preset');
  const sr = payload.sampleRate || 44100;
  postProgress(id, 0.2, 'Applying voice effect…');
  const outL = applyVoiceFx(left, sr, preset);
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 0.6, 'Applying voice effect…');
  const outR = applyVoiceFx(right, sr, preset);
  postProgress(id, 1, 'Done');
  self.postMessage(
    { type: 'result', id, result: { kind: 'audio', left: outL.buffer, right: outR.buffer } },
    { transfer: [outL.buffer as ArrayBuffer, outR.buffer as ArrayBuffer] },
  );
}

/** Spectral-gating noise reduction. Noise profile from the first 0.5s. */
async function runDenoise(
  id: string, payload: JobMessage['payload'], signal: AbortSignal,
): Promise<void> {
  const { left, right } = payload;
  if (!left || !right) throw new Error('missing audio data');
  const intensity = payload.intensity ?? 0.7;
  const { denoiseChannel } = await import('./denoise');
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 0.05, 'Learning noise profile…');
  const outL = denoiseChannel(left, intensity, (f) => postProgress(id, 0.05 + f * 0.45, 'Removing noise…'));
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  const outR = denoiseChannel(right, intensity, (f) => postProgress(id, 0.5 + f * 0.45, 'Removing noise…'));
  postProgress(id, 1, 'Done');
  self.postMessage(
    { type: 'result', id, result: { kind: 'audio', left: outL.buffer, right: outR.buffer } },
    { transfer: [outL.buffer as ArrayBuffer, outR.buffer as ArrayBuffer] },
  );
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as JobMessage | { type: 'cancel'; id: string };
  if (msg.type === 'cancel') {
    abortControllers.get(msg.id)?.abort();
    abortControllers.delete(msg.id);
    return;
  }
  if (msg.type !== 'job') return;
  const { id, jobType, payload } = msg;
  const controller = new AbortController();
  abortControllers.set(id, controller);
  try {
    if (!payload.left || !payload.right) throw new Error('missing audio data');
    if (jobType === 'separate') {
      await runSeparate(id, payload.left, payload.right, controller.signal);
    } else if (jobType === 'separateFast') {
      runSeparateFast(id, payload.left, payload.right);
    } else if (jobType === 'pitchShift' || jobType === 'timeStretch') {
      await runPitchTime(id, jobType, payload, controller.signal);
    } else if (jobType === 'voiceFx') {
      await runVoiceFx(id, payload, controller.signal);
    } else if (jobType === 'denoise') {
      await runDenoise(id, payload, controller.signal);
    } else {
      throw new Error(`unknown job type: ${jobType}`);
    }
  } catch (err) {
    const message = err instanceof DOMException && err.name === 'AbortError'
      ? 'cancelled'
      : (err as Error).message || 'processing failed';
    self.postMessage({ type: 'error', id, message });
  } finally {
    abortControllers.delete(id);
  }
};

export {};
