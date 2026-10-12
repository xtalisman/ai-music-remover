/* Spectral-gating noise reduction (pure DSP, worker-safe, testable).
   Noise profile is estimated from the first ~0.5s of audio. */
import { fft, periodicHann, N_FFT, HOP, BINS_FULL } from './dsp';

/** Denoise one mono channel. intensity 0..1. */
export function denoiseChannel(
  x: Float32Array,
  intensity: number,
  onProgress?: (f: number) => void,
): Float32Array {
  const hann = periodicHann();
  const frames = 1 + Math.floor((x.length - N_FFT) / HOP);
  const profFrames = Math.min(frames, Math.floor(0.5 * 44100 / HOP));
  const profile = new Float64Array(BINS_FULL);
  const re = new Float64Array(N_FFT), im = new Float64Array(N_FFT);
  const mags: Float32Array[] = [];

  for (let f = 0; f < frames; f++) {
    const st = f * HOP;
    for (let i = 0; i < N_FFT; i++) { re[i] = (x[st + i] || 0) * hann[i]; im[i] = 0; }
    fft(re, im);
    const m = new Float32Array(BINS_FULL);
    for (let k = 0; k < BINS_FULL; k++) {
      m[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      if (f < profFrames) profile[k] += m[k];
    }
    mags.push(m);
    if (onProgress && f % 200 === 0) onProgress((f / frames) * 0.45);
  }
  for (let k = 0; k < BINS_FULL; k++) profile[k] /= Math.max(1, profFrames);

  const y = new Float32Array(x.length);
  const wsum = new Float32Array(x.length);
  const re2 = new Float64Array(N_FFT), im2 = new Float64Array(N_FFT);
  for (let f = 0; f < frames; f++) {
    const st = f * HOP;
    for (let i = 0; i < N_FFT; i++) { re[i] = (x[st + i] || 0) * hann[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < BINS_FULL; k++) {
      const m = mags[f][k];
      const thresh = profile[k] * (1 + intensity * 2.5);
      let gain = 1;
      if (m < thresh) gain = Math.max(0.02, (m / thresh) * 0.6);
      else if (m < thresh * 1.6) gain = 0.6 + 0.4 * ((m - thresh) / (thresh * 0.6));
      re2[k] = re[k] * gain; im2[k] = im[k] * gain;
    }
    for (let k = BINS_FULL; k < N_FFT; k++) { re2[k] = re2[N_FFT - k]; im2[k] = -im2[N_FFT - k]; }
    for (let k = 0; k < N_FFT; k++) im2[k] = -im2[k];
    fft(re2, im2);
    for (let k = 0; k < N_FFT; k++) { re2[k] /= N_FFT; im2[k] = -im2[k] / N_FFT; }
    for (let i = 0; i < N_FFT && st + i < y.length; i++) {
      y[st + i] += re2[i] * hann[i];
      wsum[st + i] += hann[i] * hann[i];
    }
    if (onProgress && f % 200 === 0) onProgress(0.45 + (f / frames) * 0.5);
  }
  for (let i = 0; i < y.length; i++) {
    if (wsum[i] > 1e-3) y[i] /= wsum[i];
    else y[i] = 0;
  }
  return y;
}
