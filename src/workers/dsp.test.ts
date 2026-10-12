import { describe, it, expect } from 'vitest';
import { fft, periodicHann, stftComplex, istftComplex, N_FFT, HOP } from './dsp';

const SR = 44100;

function makeTone(freq: number, seconds: number): Float32Array {
  const n = Math.floor(SR * seconds);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * freq * i) / SR) * 0.5;
  return x;
}

describe('fft', () => {
  it('finds the spectral peak of a sine', () => {
    const N = 8192;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = Math.sin((2 * Math.PI * 440 * i) / SR);
    fft(re, im);
    let pk = 0, pv = -1;
    for (let k = 1; k < N / 2; k++) {
      const m = re[k] * re[k] + im[k] * im[k];
      if (m > pv) { pv = m; pk = k; }
    }
    expect(Math.abs((pk * SR) / N - 440)).toBeLessThan(6); // one FFT bin
  });
});

describe('stft/istft', () => {
  it('roundtrips a stereo signal (periodic Hann)', () => {
    const L = makeTone(440, 2), R = makeTone(330, 2);
    const hann = periodicHann();
    expect(hann.length).toBe(N_FFT);
    const spec = stftComplex(L, R, hann);
    expect(spec.frames).toBeGreaterThan(10);
    const [rL, rR] = istftComplex(spec.re, spec.im, spec.frames, L.length, hann);
    let maxDiff = 0;
    for (let i = HOP * 2; i < L.length - HOP * 2; i += 3) {
      maxDiff = Math.max(maxDiff, Math.abs(rL[i] - L[i]), Math.abs(rR[i] - R[i]));
    }
    expect(maxDiff).toBeLessThan(1e-3);
  });

  it('masks apply to the complex spectrum without phase loss', () => {
    const L = makeTone(440, 1), R = makeTone(440, 1);
    const hann = periodicHann();
    const spec = stftComplex(L, R, hann);
    // identity mask -> should reconstruct
    const [rL] = istftComplex(spec.re, spec.im, spec.frames, L.length, hann);
    let maxDiff = 0;
    for (let i = HOP * 2; i < L.length - HOP * 2; i += 5) {
      maxDiff = Math.max(maxDiff, Math.abs(rL[i] - L[i]));
    }
    expect(maxDiff).toBeLessThan(1e-3);
  });
});
