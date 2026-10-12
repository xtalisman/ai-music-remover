/* Promise-based client for the audio Web Worker.
   Usage:
     const job = runAudioJob('separate', { left, right }, (f, label) => {...});
     const result = await job.promise; // or job.cancel()
*/
import type { JobType, VoiceFxPreset } from '../workers/audio.worker';

export type { VoiceFxPreset };

export interface StemBuffers {
  [stem: string]: [ArrayBuffer, ArrayBuffer]; // [left, right] per stem
}

export type JobResult =
  | { kind: 'stems' | 'stemsFast'; sampleRate?: number; stems: StemBuffers }
  | { kind: 'audio'; left: ArrayBuffer; right: ArrayBuffer };

export interface SeparationJobResult extends Extract<JobResult, { kind: 'stems' | 'stemsFast' }> {}

interface PendingJob {
  resolve: (r: JobResult) => void;
  reject: (e: Error) => void;
  onProgress?: (fraction: number, label: string) => void;
}

export interface JobPayload {
  left: Float32Array;
  right: Float32Array;
  sampleRate?: number;
  semitones?: number;
  rate?: number;
  preset?: VoiceFxPreset;
  intensity?: number;
}

let worker: Worker | null = null;
const pending = new Map<string, PendingJob>();
let jobSeq = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/audio.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: 'progress'; id: string; fraction: number; label: string }
        | { type: 'result'; id: string; result: JobResult }
        | { type: 'error'; id: string; message: string };
      const job = pending.get(msg.id);
      if (!job) return;
      if (msg.type === 'progress') job.onProgress?.(msg.fraction, msg.label);
      else if (msg.type === 'result') { pending.delete(msg.id); job.resolve(msg.result); }
      else {
        pending.delete(msg.id);
        job.reject(msg.message === 'cancelled' ? new DOMException('cancelled', 'AbortError') : new Error(msg.message));
      }
    };
    worker.onerror = (e) => {
      // Fail every pending job so callers never hang.
      for (const [id, job] of pending) {
        pending.delete(id);
        job.reject(new Error(e.message || 'audio worker error'));
      }
      worker = null;
    };
  }
  return worker;
}

export interface AudioJob {
  promise: Promise<JobResult>;
  cancel: () => void;
}

export function runAudioJob(
  jobType: JobType,
  payload: JobPayload,
  onProgress?: (fraction: number, label: string) => void,
): AudioJob {
  const id = `job-${Date.now()}-${jobSeq++}`;
  const w = getWorker();
  let settled = false;
  const promise = new Promise<JobResult>((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => { settled = true; resolve(r); },
      reject: (e) => { settled = true; reject(e); },
      onProgress,
    });
  });
  w.postMessage(
    {
      type: 'job', id, jobType,
      payload: {
        left: payload.left, right: payload.right,
        sampleRate: payload.sampleRate, semitones: payload.semitones, rate: payload.rate,
        preset: payload.preset, intensity: payload.intensity,
      },
    },
    { transfer: [payload.left.buffer, payload.right.buffer] },
  );
  return {
    promise,
    cancel: () => {
      if (settled) return;
      w.postMessage({ type: 'cancel', id });
    },
  };
}

/** Reconstruct Float32Arrays from transferred buffers. */
export function buffersToChannels(bufs: [ArrayBuffer, ArrayBuffer]): [Float32Array, Float32Array] {
  return [new Float32Array(bufs[0]), new Float32Array(bufs[1])];
}
