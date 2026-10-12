import { describe, it, expect } from 'vitest';
import { timeStretch, pitchShift } from './pitch';
import { fft } from './dsp';

const SR = 44100;

function tone(freq: number, seconds: number): Float32Array {
  const n = Math.floor(SR * seconds);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * freq * i) / SR) * 0.5;
  return x;
}

function spectralPeak(x: Float32Array): number {
  const N = 16384;
  const re = new Float64Array(N), im = new Float64Array(N);
  const start = Math.floor(x.length / 4);
  for (let i = 0; i < N && start + i < x.length; i++) re[i] = x[start + i];
  fft(re, im);
  let pk = 0, pv = -1;
  for (let k = 2; k < N / 2; k++) {
    const m = re[k] * re[k] + im[k] * im[k];
    if (m > pv) { pv = m; pk = k; }
  }
  return (pk * SR) / N;
}

describe('timeStretch', () => {
  it('doubles duration at rate 2 without changing pitch', () => {
    const x = tone(440, 1);
    const y = timeStretch(x, 2);
    expect(y.length).toBeGreaterThan(x.length * 1.8);
    expect(y.length).toBeLessThan(x.length * 2.2);
    expect(Math.abs(spectralPeak(y) - 440)).toBeLessThan(15);
  });
});

describe('pitchShift', () => {
  it('+12 semitones doubles frequency, keeps duration', () => {
    const x = tone(440, 1);
    const y = pitchShift(x, 12);
    expect(y.length).toBeGreaterThan(x.length * 0.9);
    expect(y.length).toBeLessThan(x.length * 1.1);
    expect(Math.abs(spectralPeak(y) - 880)).toBeLessThan(30);
  });
  it('-12 semitones halves frequency', () => {
    const x = tone(440, 1);
    const y = pitchShift(x, -12);
    expect(Math.abs(spectralPeak(y) - 220)).toBeLessThan(20);
  });
});
