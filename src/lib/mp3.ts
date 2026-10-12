/* MP3 encoding via lamejs (main thread; chunked to avoid blocking).
   Uses a vendored lame.all.js bundle (src/lib/lame.all.bundle.js) because the
   lamejs npm package's ES/CJS modules reference bare globals (MPEGMode, Lame)
   that break under Vite bundling. */
import lamejs from './lame.all.bundle.js';

export async function encodeMp3(
  left: Float32Array, right: Float32Array, sampleRate: number,
  onProgress?: (f: number) => void,
): Promise<Blob> {
  const kbps = 192;
  const encoder = new lamejs.Mp3Encoder(2, sampleRate, kbps);
  const n = Math.min(left.length, right.length);
  const chunk = 1152 * 10;
  const parts: Int8Array[] = [];
  const toI16 = (f: Float32Array, from: number, len: number): Int16Array => {
    const out = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const v = Math.max(-1, Math.min(1, f[from + i]));
      out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return out;
  };
  for (let i = 0; i < n; i += chunk) {
    const len = Math.min(chunk, n - i);
    const data = encoder.encodeBuffer(toI16(left, i, len), toI16(right, i, len));
    if (data.length) parts.push(data);
    if (onProgress && i % (chunk * 20) === 0) {
      onProgress(i / n);
      await new Promise((r) => setTimeout(r, 0)); // yield to UI
    }
  }
  const end = encoder.flush();
  if (end.length) parts.push(end);
  onProgress?.(1);
  return new Blob(parts as unknown as BlobPart[], { type: 'audio/mpeg' });
}
