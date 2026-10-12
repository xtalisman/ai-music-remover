import { describe, it, expect } from 'vitest';
import { denoiseChannel } from './denoise';

const SR = 44100;

function snr(sig: Float32Array, ref: Float32Array, from: number, to: number): number {
  let sE = 0, nE = 0;
  for (let i = from; i < to; i++) {
    sE += ref[i] * ref[i];
    const d = sig[i] - ref[i];
    nE += d * d;
  }
  return 10 * Math.log10(sE / Math.max(1e-12, nE));
}

describe('denoiseChannel', () => {
  it('improves SNR on a noisy tone', () => {
    const N = SR * 4;
    const clean = new Float32Array(N);
    const noisy = new Float32Array(N);
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x3fffffff - 1;
    };
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const tone = Math.sin(2 * Math.PI * 440 * t) * 0.5;
      clean[i] = tone;
      const noise = rand() * 0.12 + Math.sin(2 * Math.PI * 50 * t) * 0.08;
      noisy[i] = i < SR * 0.5 ? noise : tone + noise; // first 0.5s: noise only
    }
    const before = snr(noisy, clean, SR, N);
    const out = denoiseChannel(noisy, 0.7);
    const after = snr(out, clean, SR, N);
    // eslint-disable-next-line no-console
    console.log(`denoise SNR: ${before.toFixed(1)} -> ${after.toFixed(1)} dB`);
    expect(after).toBeGreaterThan(before + 3); // at least 3dB improvement
  });

  it('does not destroy a clean signal', () => {
    const N = SR * 2;
    const x = new Float32Array(N);
    for (let i = 0; i < N; i++) x[i] = Math.sin((2 * Math.PI * 440 * i) / SR) * 0.5;
    const out = denoiseChannel(x, 0.7);
    // correlation should stay very high
    let dot = 0, nx = 0, no = 0;
    for (let i = SR / 2; i < N - SR / 2; i++) {
      dot += x[i] * out[i]; nx += x[i] * x[i]; no += out[i] * out[i];
    }
    const corr = dot / Math.sqrt(nx * no);
    expect(corr).toBeGreaterThan(0.95);
  });
});
