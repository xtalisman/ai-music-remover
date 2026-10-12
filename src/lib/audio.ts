/* Audio I/O helpers (main thread).
   Heavy DSP lives in the worker; this module handles decode/resample/encode. */
import { TARGET_SR } from '../workers/separator';

let decodeCtx: AudioContext | null = null;
function getDecodeCtx(): AudioContext {
  if (!decodeCtx) decodeCtx = new AudioContext();
  return decodeCtx;
}

/** Decode an audio or video file to stereo Float32Arrays at its native rate. */
export async function decodeAudioFile(file: File): Promise<{
  left: Float32Array; right: Float32Array; sampleRate: number; duration: number;
}> {
  const buf = await file.arrayBuffer();
  // slice() because decodeAudioData detaches the buffer
  const audioBuf = await getDecodeCtx().decodeAudioData(buf.slice(0));
  const left = audioBuf.getChannelData(0).slice();
  const right = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1).slice() : left.slice();
  return { left, right, sampleRate: audioBuf.sampleRate, duration: audioBuf.duration };
}

/** Resample stereo audio to 44.1kHz (the separation model's native rate). */
export async function resampleTo44100(
  left: Float32Array, right: Float32Array, fromRate: number,
): Promise<[Float32Array, Float32Array]> {
  if (fromRate === TARGET_SR) return [left, right];
  const n = left.length;
  const offline = new OfflineAudioContext(2, Math.ceil((n / fromRate) * TARGET_SR), TARGET_SR);
  const src = offline.createBufferSource();
  const ab = offline.createBuffer(2, n, fromRate);
  ab.getChannelData(0).set(left);
  ab.getChannelData(1).set(right);
  src.buffer = ab;
  src.connect(offline.destination);
  src.start();
  const out = await offline.startRendering();
  return [out.getChannelData(0).slice(), out.getChannelData(1).slice()];
}

/** Encode stereo Float32Arrays as a 16-bit PCM WAV Blob. */
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const n = Math.min(left.length, right.length);
  const buffer = new ArrayBuffer(44 + n * 4);
  const v = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + n * 4, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  writeStr(36, 'data');
  v.setUint32(40, n * 4, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    v.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true); off += 2;
    v.setInt16(off, r < 0 ? r * 0x8000 : r * 0x7fff, true); off += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Mix stems with per-stem gains (0..1). */
export function mixStems(
  stems: Record<string, [Float32Array, Float32Array]>,
  gains: Record<string, number>,
): [Float32Array, Float32Array] {
  const names = Object.keys(stems);
  const n = stems[names[0]][0].length;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const name of names) {
    const g = gains[name] ?? 1;
    if (g === 0) continue;
    const [l, r] = stems[name];
    for (let i = 0; i < n; i++) { L[i] += l[i] * g; R[i] += r[i] * g; }
  }
  return [L, R];
}

/** Format seconds as m:ss. */
export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Check basic WebGPU/WASM capability for the device warning. */
export function deviceCapabilities(): { webgpu: boolean; memoryGB: number | null; weak: boolean } {
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  return { webgpu, memoryGB: mem, weak: mem !== null && mem < 4 };
}
