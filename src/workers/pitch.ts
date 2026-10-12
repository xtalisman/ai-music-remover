/* Phase-vocoder time stretch + pitch shift (pure DSP, worker-safe).
   - timeStretch(x, rate): duration x rate, pitch unchanged
   - pitchShift(x, semitones): pitch shifted, duration unchanged
     (implemented as stretch by 1/p then resample by p)
*/
import { fft } from './dsp';

const N = 4096;
const HA = 1024; // analysis hop

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}
const WIN = hann(N);

function princarg(x: number): number {
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Phase-vocoder time stretch. rate > 1 = longer. */
export function timeStretch(x: Float32Array, rate: number): Float32Array {
  if (rate <= 0) throw new Error('rate must be positive');
  if (Math.abs(rate - 1) < 1e-6) return x.slice();
  const Hs = Math.max(64, Math.round(HA * rate)); // synthesis hop
  const n = x.length;
  const aFrames = 1 + Math.floor((n - N) / HA);
  const sFrames = Math.ceil(aFrames * rate);
  const outLen = sFrames * Hs + N;
  const out = new Float64Array(outLen);
  const wsum = new Float64Array(outLen);

  const re = new Float64Array(N), im = new Float64Array(N);
  // analysis magnitudes/phases
  const mag: Float64Array[] = [];
  const phase: Float64Array[] = [];
  for (let f = 0; f < aFrames; f++) {
    const st = f * HA;
    for (let i = 0; i < N; i++) { re[i] = (x[st + i] || 0) * WIN[i]; im[i] = 0; }
    fft(re, im);
    const m = new Float64Array(N / 2 + 1), p = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) {
      m[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      p[k] = Math.atan2(im[k], re[k]);
    }
    mag.push(m); phase.push(p);
  }

  const omega = new Float64Array(N / 2 + 1);
  for (let k = 0; k <= N / 2; k++) omega[k] = (2 * Math.PI * k) / N;

  const syn = new Float64Array(N / 2 + 1); // synthesis phases
  const sre = new Float64Array(N), sim = new Float64Array(N);

  for (let s = 0; s < sFrames; s++) {
    const aPos = s / rate; // position in analysis frames
    const f0 = Math.floor(aPos), frac = aPos - f0;
    const f1 = Math.min(aFrames - 1, f0 + 1);
    for (let k = 0; k <= N / 2; k++) {
      const m = mag[f0][k] * (1 - frac) + mag[f1][k] * frac;
      // true frequency from phase difference
      const dphi = princarg(phase[f1][k] - phase[f0][k] - omega[k] * HA);
      const trueFreq = omega[k] + dphi / HA;
      syn[k] += trueFreq * Hs;
      sre[k] = m * Math.cos(syn[k]);
      sim[k] = m * Math.sin(syn[k]);
    }
    // mirror + inverse fft
    for (let k = N / 2 + 1; k < N; k++) { sre[k] = sre[N - k]; sim[k] = -sim[N - k]; }
    for (let k = 0; k < N; k++) sim[k] = -sim[k];
    fft(sre, sim);
    const st = s * Hs;
    for (let i = 0; i < N && st + i < outLen; i++) {
      out[st + i] += (sre[i] / N) * WIN[i];
      wsum[st + i] += WIN[i] * WIN[i];
    }
  }
  const y = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) y[i] = wsum[i] > 1e-3 ? out[i] / wsum[i] : 0;
  // trim to expected length
  const expected = Math.round(n * rate);
  return y.slice(0, Math.min(expected, y.length));
}

/** Simple linear resampler (for the pitch-shift second stage). */
export function resampleLinear(x: Float32Array, ratio: number): Float32Array {
  const outLen = Math.max(1, Math.round(x.length / ratio));
  const y = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos), frac = pos - i0;
    const a = x[i0] || 0, b = x[i0 + 1] || 0;
    y[i] = a * (1 - frac) + b * frac;
  }
  return y;
}

/** Pitch shift by semitones; duration unchanged.
 *  Method: time-stretch longer by p, then resample faster by p
 *  (duration returns to original, pitch rises by p). */
export function pitchShift(x: Float32Array, semitones: number): Float32Array {
  if (Math.abs(semitones) < 1e-6) return x.slice();
  const p = Math.pow(2, semitones / 12);
  const stretched = timeStretch(x, p);
  return resampleLinear(stretched, p);
}
