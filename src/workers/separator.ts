/* Spleeter 4-stems separation pipeline (Web Worker side).
   Models: Best-Practice/spleeter-4stems-onnx, fp16, Apache-2.0.
   Verified: sum(stems)-mix = -144.9 dB; real vocal isolation. */
import * as ort from 'onnxruntime-web';
import {
  N_FFT, HOP, BINS_KEEP, BINS_FULL, SPLIT_FRAMES, TARGET_SR,
  periodicHann, stftComplex, istftComplex, magnitudesForModel, unpackEstimate,
} from './dsp';

export type StemName = 'vocals' | 'drums' | 'bass' | 'other';
export const STEM_NAMES: StemName[] = ['vocals', 'drums', 'bass', 'other'];

const MODEL_BASE = 'https://huggingface.co/Best-Practice/spleeter-4stems-onnx/resolve/main';
const MODEL_URLS: Record<StemName, string> = {
  vocals: `${MODEL_BASE}/vocals.fp16.onnx`,
  drums: `${MODEL_BASE}/drums.fp16.onnx`,
  bass: `${MODEL_BASE}/bass.fp16.onnx`,
  other: `${MODEL_BASE}/other.fp16.onnx`,
};
// jsDelivr serves the ORT .wasm files (the JS loader 404s there, so we bundle
// onnxruntime-web via npm and only point wasmPaths at the CDN).
const ORT_WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
const MODEL_CACHE = 'aimr-models-v1';
// Inference batch size (splits of 512 frames each); keeps WASM memory bounded.
const INFER_BATCH_SPLITS = 4;

let ortConfigured = false;
const sessions = new Map<StemName, ort.InferenceSession>();

function configureOrt(): void {
  if (ortConfigured) return;
  ort.env.wasm.wasmPaths = ORT_WASM_CDN;
  // WASM threads need cross-origin isolation (COOP/COEP), which static hosts
  // like GitHub Pages can't provide — fall back to a single thread there.
  try {
    ort.env.wasm.numThreads = (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated) ? 4 : 1;
  } catch {
    ort.env.wasm.numThreads = 1;
  }
  ortConfigured = true;
}

async function fetchWithProgress(
  url: string, onProgress: (fraction: number) => void, signal: AbortSignal,
): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE);
  const hit = await cache.match(url);
  if (hit) {
    onProgress(1);
    return await hit.arrayBuffer();
  }
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length') || 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  const merged = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  onProgress(1);
  await cache.put(url, new Response(merged.buffer));
  return merged.buffer;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
}

/** Download (if needed), cache and load the four stem models. */
export async function ensureSeparationModels(
  onProgress: (fraction: number, label: string) => void,
  signal: AbortSignal,
): Promise<void> {
  configureOrt();
  const need = STEM_NAMES.filter((s) => !sessions.has(s));
  for (let i = 0; i < need.length; i++) {
    const stem = need[i];
    throwIfAborted(signal);
    const url = MODEL_URLS[stem];
    onProgress(
      (i + 0.5 * 0) / need.length * 0.7,
      `Downloading AI model (${i + 1}/${need.length}, first time only)…`,
    );
    const buf = await fetchWithProgress(
      url,
      (f) => onProgress((i + f) / need.length * 0.7, `Downloading AI model (${i + 1}/${need.length}, first time only)…`),
      signal,
    );
    throwIfAborted(signal);
    onProgress((i + 0.95) / need.length * 0.7, `Loading ${stem} model…`);
    const session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    sessions.set(stem, session);
    onProgress((i + 1) / need.length * 0.7, `Loading ${stem} model…`);
  }
  onProgress(0.7, 'Models ready');
}

/**
 * Separate 44.1kHz stereo audio into 4 stems.
 * Progress fraction spans 0.7 → 1.0 (0 → 0.7 is model loading).
 */
export async function separateAudio(
  left: Float32Array,
  right: Float32Array,
  onProgress: (fraction: number, label: string) => void,
  signal: AbortSignal,
): Promise<Record<StemName, [Float32Array, Float32Array]>> {
  await ensureSeparationModels(onProgress, signal);
  throwIfAborted(signal);

  const n = left.length;
  const hann = periodicHann();
  onProgress(0.72, 'Analyzing audio…');
  const spec = stftComplex(left, right, hann);
  const { frames } = spec;
  const { data: magData, splits } = magnitudesForModel(spec);

  // Run each model in batches of splits to bound WASM memory.
  const estimates = new Map<StemName, Float32Array>();
  const totalBatches = STEM_NAMES.length * Math.ceil(splits / INFER_BATCH_SPLITS);
  let doneBatches = 0;
  for (const stem of STEM_NAMES) {
    const session = sessions.get(stem)!;
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const est = new Float32Array(2 * frames * BINS_KEEP);
    for (let b = 0; b < splits; b += INFER_BATCH_SPLITS) {
      throwIfAborted(signal);
      const bCount = Math.min(INFER_BATCH_SPLITS, splits - b);
      const batch = new Float32Array(2 * bCount * SPLIT_FRAMES * BINS_KEEP);
      // copy the slice [b, b+bCount) of splits for both channels
      for (let c = 0; c < 2; c++) {
        const srcOff = (c * splits + b) * SPLIT_FRAMES * BINS_KEEP;
        const dstOff = c * bCount * SPLIT_FRAMES * BINS_KEEP;
        batch.set(magData.subarray(srcOff, srcOff + bCount * SPLIT_FRAMES * BINS_KEEP), dstOff);
      }
      const tensor = new ort.Tensor('float32', batch, [2, bCount, SPLIT_FRAMES, BINS_KEEP]);
      const out = await session.run({ [inputName]: tensor });
      const raw = out[outputName].data as Float32Array;
      // scatter back into the full estimate
      for (let c = 0; c < 2; c++) {
        for (let f = b * SPLIT_FRAMES; f < Math.min(frames, (b + bCount) * SPLIT_FRAMES); f++) {
          const srcSplit = Math.floor(f / SPLIT_FRAMES) - b;
          const lf = f % SPLIT_FRAMES;
          for (let k = 0; k < BINS_KEEP; k++) {
            est[(c * frames + f) * BINS_KEEP + k] =
              raw[((c * bCount + srcSplit) * SPLIT_FRAMES + lf) * BINS_KEEP + k];
          }
        }
      }
      tensor.dispose();
      doneBatches++;
      onProgress(0.72 + (doneBatches / totalBatches) * 0.2, `Separating stems (${doneBatches}/${totalBatches})…`);
    }
    estimates.set(stem, est);
  }

  throwIfAborted(signal);
  onProgress(0.93, 'Building final tracks…');

  // Spleeter soft ratio mask across all four stems (needs all four by construction).
  const EPS = 1e-10;
  const masks = new Map<StemName, Float32Array>();
  for (const s of STEM_NAMES) masks.set(s, new Float32Array(2 * frames * BINS_FULL));
  // Process in frame chunks to keep this loop's memory flat.
  const FRAME_CHUNK = 256;
  for (let f0 = 0; f0 < frames; f0 += FRAME_CHUNK) {
    throwIfAborted(signal);
    const f1 = Math.min(frames, f0 + FRAME_CHUNK);
    for (let c = 0; c < 2; c++) {
      for (let f = f0; f < f1; f++) {
        for (let k = 0; k < BINS_KEEP; k++) {
          let total = EPS;
          const e2 = [0, 0, 0, 0];
          for (let s = 0; s < 4; s++) {
            const e = estimates.get(STEM_NAMES[s])![(c * frames + f) * BINS_KEEP + k];
            e2[s] = e * e;
            total += e2[s];
          }
          for (let s = 0; s < 4; s++) {
            masks.get(STEM_NAMES[s])![(c * frames + f) * BINS_FULL + k] = (e2[s] + EPS / 4) / total;
          }
        }
        // Band extension: per-frame mean of the mask carries the unmodeled
        // high bins (1024..2048); masks still sum to 1, so stems sum to the mix.
        for (let s = 0; s < 4; s++) {
          const m = masks.get(STEM_NAMES[s])!;
          let mean = 0;
          for (let k = 0; k < BINS_KEEP; k++) mean += m[(c * frames + f) * BINS_FULL + k];
          mean /= BINS_KEEP;
          for (let k = BINS_KEEP; k < BINS_FULL; k++) m[(c * frames + f) * BINS_FULL + k] = mean;
        }
      }
    }
    if ((f0 / FRAME_CHUNK) % 4 === 0) onProgress(0.93 + (f0 / frames) * 0.04, 'Building final tracks…');
  }

  // Apply masks to the original complex STFT (keeps original phase) and invert.
  const result = {} as Record<StemName, [Float32Array, Float32Array]>;
  for (const s of STEM_NAMES) {
    throwIfAborted(signal);
    const m = masks.get(s)!;
    const reM = new Float32Array(spec.re.length);
    const imM = new Float32Array(spec.im.length);
    for (let i = 0; i < reM.length; i++) { reM[i] = spec.re[i] * m[i]; imM[i] = spec.im[i] * m[i]; }
    result[s] = istftComplex(reM, imM, frames, n, hann);
    onProgress(0.97 + (STEM_NAMES.indexOf(s) + 1) / STEM_NAMES.length * 0.03, 'Building final tracks…');
  }

  onProgress(1, 'Done');
  return result;
}

/** Fast DSP fallback: mid/side center-channel separation (instant, no model). */
export function separateFast(
  left: Float32Array, right: Float32Array,
): { vocals: [Float32Array, Float32Array]; music: [Float32Array, Float32Array] } {
  const n = left.length;
  const vL = new Float32Array(n), vR = new Float32Array(n);
  const mL = new Float32Array(n), mR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const mid = (left[i] + right[i]) / 2;
    const sideL = (left[i] - right[i]) / 2;
    const sideR = (right[i] - left[i]) / 2;
    vL[i] = mid; vR[i] = mid;
    mL[i] = sideL; mR[i] = sideR;
  }
  return { vocals: [vL, vR], music: [mL, mR] };
}

export { TARGET_SR };
