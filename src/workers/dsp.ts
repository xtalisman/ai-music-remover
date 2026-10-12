/* DSP primitives for the separation pipeline.
   Ported from the verified Node prototype (sum(stems)-mix = -144.9 dB).
   Spleeter contract: periodic Hann, N_FFT=4096, HOP=1024, 44.1kHz stereo,
   model sees the first 1024 of 2049 bins. */

export const N_FFT = 4096;
export const HOP = 1024;
export const BINS_KEEP = 1024;
export const BINS_FULL = 2049;
export const SPLIT_FRAMES = 512;
export const TARGET_SR = 44100;

/** Iterative radix-2 FFT, in-place, forward, unnormalized. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const aRe = re[i + k + len / 2], aIm = im[i + k + len / 2];
        const tRe = cRe * aRe - cIm * aIm, tIm = cRe * aIm + cIm * aRe;
        re[i + k] = uRe + tRe; im[i + k] = uIm + tIm;
        re[i + k + len / 2] = uRe - tRe; im[i + k + len / 2] = uIm - tIm;
        const nRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe; cRe = nRe;
      }
    }
  }
}

/** Periodic Hann window (NOT symmetric) — matches the model's training. */
export function periodicHann(): Float64Array {
  const w = new Float64Array(N_FFT);
  for (let i = 0; i < N_FFT; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N_FFT));
  return w;
}

export interface ComplexSTFT {
  re: Float32Array; // [2][frames][2049]
  im: Float32Array; // [2][frames][2049]
  frames: number;
}

/** Stereo complex STFT. */
export function stftComplex(L: Float32Array, R: Float32Array, hann: Float64Array): ComplexSTFT {
  const n = L.length;
  const frames = 1 + Math.floor((n - N_FFT) / HOP);
  const re = new Float32Array(2 * frames * BINS_FULL);
  const im = new Float32Array(2 * frames * BINS_FULL);
  const tre = new Float64Array(N_FFT), tim = new Float64Array(N_FFT);
  const chans = [L, R];
  for (let c = 0; c < 2; c++) {
    const x = chans[c], base = c * frames * BINS_FULL;
    for (let f = 0; f < frames; f++) {
      const start = f * HOP;
      for (let i = 0; i < N_FFT; i++) { tre[i] = (x[start + i] || 0) * hann[i]; tim[i] = 0; }
      fft(tre, tim);
      for (let k = 0; k < BINS_FULL; k++) {
        re[base + f * BINS_FULL + k] = tre[k];
        im[base + f * BINS_FULL + k] = tim[k];
      }
    }
  }
  return { re, im, frames };
}

/** Inverse STFT with WOLA normalization. Guard threshold avoids edge blowup. */
export function istftComplex(
  reM: Float32Array, imM: Float32Array, frames: number, outLen: number, hann: Float64Array,
): [Float32Array, Float32Array] {
  const out: [Float32Array, Float32Array] = [new Float32Array(outLen), new Float32Array(outLen)];
  const ws: [Float32Array, Float32Array] = [new Float32Array(outLen), new Float32Array(outLen)];
  const tre = new Float64Array(N_FFT), tim = new Float64Array(N_FFT);
  for (let c = 0; c < 2; c++) {
    const base = c * frames * BINS_FULL, y = out[c], w = ws[c];
    for (let f = 0; f < frames; f++) {
      const start = f * HOP;
      for (let k = 0; k < BINS_FULL; k++) { tre[k] = reM[base + f * BINS_FULL + k]; tim[k] = imM[base + f * BINS_FULL + k]; }
      for (let k = BINS_FULL; k < N_FFT; k++) { tre[k] = tre[N_FFT - k]; tim[k] = -tim[N_FFT - k]; }
      for (let k = 0; k < N_FFT; k++) tim[k] = -tim[k];
      fft(tre, tim);
      for (let k = 0; k < N_FFT; k++) { tre[k] /= N_FFT; tim[k] = -tim[k] / N_FFT; }
      for (let i = 0; i < N_FFT && start + i < outLen; i++) {
        y[start + i] += tre[i] * hann[i];
        w[start + i] += hann[i] * hann[i];
      }
    }
    // Only normalize where the window overlap is substantial; leave the
    // extreme edges (first/last ~hop samples) unnormalized to avoid blowup.
    for (let i = 0; i < outLen; i++) {
      if (w[i] > 1e-3) y[i] /= w[i];
      else y[i] = 0;
    }
  }
  return out;
}

/** Magnitude spectrogram (first 1024 bins) laid out as [2][splits][512][1024]. */
export function magnitudesForModel(spec: ComplexSTFT): { data: Float32Array; splits: number } {
  const { re, im, frames } = spec;
  const splits = Math.ceil(frames / SPLIT_FRAMES);
  const data = new Float32Array(2 * splits * SPLIT_FRAMES * BINS_KEEP);
  for (let c = 0; c < 2; c++) {
    for (let f = 0; f < frames; f++) {
      const split = Math.floor(f / SPLIT_FRAMES), lf = f % SPLIT_FRAMES;
      for (let k = 0; k < BINS_KEEP; k++) {
        const r = re[c * frames * BINS_FULL + f * BINS_FULL + k];
        const ii = im[c * frames * BINS_FULL + f * BINS_FULL + k];
        data[((c * splits + split) * SPLIT_FRAMES + lf) * BINS_KEEP + k] = Math.sqrt(r * r + ii * ii);
      }
    }
  }
  return { data, splits };
}

/** Unpack one model's [2][splits][512][1024] output to [2][frames][1024]. */
export function unpackEstimate(
  raw: Float32Array | number[], splits: number, frames: number,
): Float32Array {
  const est = new Float32Array(2 * frames * BINS_KEEP);
  for (let c = 0; c < 2; c++) {
    for (let f = 0; f < frames; f++) {
      const split = Math.floor(f / SPLIT_FRAMES), lf = f % SPLIT_FRAMES;
      for (let k = 0; k < BINS_KEEP; k++) {
        est[(c * frames + f) * BINS_KEEP + k] =
          raw[((c * splits + split) * SPLIT_FRAMES + lf) * BINS_KEEP + k];
      }
    }
  }
  return est;
}
