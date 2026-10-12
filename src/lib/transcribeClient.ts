/* Promise-based client for the transcription worker. */
export interface TranscriptChunk { timestamp: [number, number]; text: string; }
export interface TranscriptResult { text: string; chunks: TranscriptChunk[]; }

interface Pending {
  resolve: (r: { kind: string; text?: string; chunks?: TranscriptChunk[]; texts?: string[] }) => void;
  reject: (e: Error) => void;
  onProgress?: (f: number, label: string) => void;
}

let worker: Worker | null = null;
const pending = new Map<string, Pending>();
let seq = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/transcribe.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: 'progress'; id: string; fraction: number; label: string }
        | { type: 'result'; id: string; result: { kind: string; text?: string; chunks?: TranscriptChunk[]; texts?: string[] } }
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
      for (const [id, job] of pending) {
        pending.delete(id);
        job.reject(new Error(e.message || 'transcription worker error'));
      }
      worker = null;
    };
  }
  return worker;
}

export interface TextJob {
  promise: Promise<{ kind: string; text?: string; chunks?: TranscriptChunk[]; texts?: string[] }>;
  cancel: () => void;
}

function submit(
  jobType: 'transcribe' | 'translate',
  payload: { audio?: Float32Array; texts?: string[]; model?: string },
  onProgress?: (f: number, label: string) => void,
): TextJob {
  const id = `txt-${Date.now()}-${seq++}`;
  const w = getWorker();
  let settled = false;
  const promise = new Promise<{ kind: string; text?: string; chunks?: TranscriptChunk[]; texts?: string[] }>((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => { settled = true; resolve(r); },
      reject: (e) => { settled = true; reject(e); },
      onProgress,
    });
  });
  const transfer: ArrayBuffer[] = payload.audio ? [payload.audio.buffer as ArrayBuffer] : [];
  w.postMessage({ type: 'job', id, jobType, payload }, transfer.length ? { transfer } : undefined);
  return {
    promise,
    cancel: () => { if (!settled) w.postMessage({ type: 'cancel', id }); },
  };
}

export function transcribeAudio(audio16k: Float32Array, onProgress?: (f: number, label: string) => void): TextJob {
  return submit('transcribe', { audio: audio16k }, onProgress);
}

export function translateTexts(texts: string[], model: string, onProgress?: (f: number, label: string) => void): TextJob {
  return submit('translate', { texts, model }, onProgress);
}

/** Resample to 16kHz mono for Whisper. */
export async function to16kMono(
  left: Float32Array, right: Float32Array, fromRate: number,
): Promise<Float32Array> {
  const n = left.length;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) mono[i] = (left[i] + right[i]) / 2;
  if (fromRate === 16000) return mono;
  const offline = new OfflineAudioContext(1, Math.ceil((n / fromRate) * 16000), 16000);
  const src = offline.createBufferSource();
  const ab = offline.createBuffer(1, n, fromRate);
  ab.getChannelData(0).set(mono);
  src.buffer = ab;
  src.connect(offline.destination);
  src.start();
  const out = await offline.startRendering();
  return out.getChannelData(0).slice();
}
