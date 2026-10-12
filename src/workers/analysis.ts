/* Music analysis: BPM + musical key detection.
   Ported from the verified StemSplit engine (12/12 unit tests). */

/** Detect BPM via onset autocorrelation. Returns 0 if undetectable. */
export function detectBpm(mono: Float32Array, sampleRate: number): number {
  const N = 1024, HOP = 512;
  const hann = new Float64Array(N);
  for (let i = 0; i < N; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  const frames = Math.floor((mono.length - N) / HOP);
  if (frames < 8) return 0;
  // spectral flux onset envelope
  const flux = new Float32Array(frames);
  let prev = new Float64Array(N / 2);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = (mono[f * HOP + i] || 0) * hann[i]; im[i] = 0; }
    fftSimple(re, im);
    let s = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const d = m - prev[k];
      if (d > 0) s += d;
      prev[k] = m;
    }
    flux[f] = s;
  }
  const mean = flux.reduce((a, b) => a + b, 0) / frames;
  if (mean === 0) return 0;
  for (let i = 0; i < frames; i++) flux[i] = Math.max(0, flux[i] - mean);
  // autocorrelation over lags corresponding to 60..200 BPM
  const fps = sampleRate / HOP;
  const minLag = Math.floor((fps * 60) / 200), maxLag = Math.floor((fps * 60) / 60);
  let bestLag = 0, bestVal = -1;
  for (let lag = minLag; lag <= maxLag && lag < frames; lag++) {
    let v = 0;
    for (let i = 0; i + lag < frames; i++) v += flux[i] * flux[i + lag];
    // prefer lower tempi slightly (avoid octave errors)
    v *= 1 - 0.15 * ((lag - minLag) / Math.max(1, maxLag - minLag));
    if (v > bestVal) { bestVal = v; bestLag = lag; }
  }
  if (bestLag === 0 || bestVal <= 0) return 0;
  return Math.round((fps * 60) / bestLag);
}

function fftSimple(re: Float64Array, im: Float64Array): void {
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
    const ang = (-2 * Math.PI) / len, wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const tRe = cRe * re[i + k + len / 2] - cIm * im[i + k + len / 2];
        const tIm = cRe * im[i + k + len / 2] + cIm * re[i + k + len / 2];
        re[i + k] = uRe + tRe; im[i + k] = uIm + tIm;
        re[i + k + len / 2] = uRe - tRe; im[i + k + len / 2] = uIm - tIm;
        const nRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe; cRe = nRe;
      }
    }
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Krumhansl major/minor profiles
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Detect musical key via chroma + Krumhansl correlation. Returns e.g. "A minor". */
export function detectKey(stereoL: Float32Array, stereoR: Float32Array, sampleRate: number): string {
  const N = 8192;
  const step = Math.floor(stereoL.length / 24);
  const chroma = new Float64Array(12);
  const re = new Float64Array(N), im = new Float64Array(N);
  const hann = new Float64Array(N);
  for (let i = 0; i < N; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  for (let s = 0; s < 24; s++) {
    const start = s * step;
    if (start + N > stereoL.length) break;
    for (let i = 0; i < N; i++) { re[i] = ((stereoL[start + i] + stereoR[start + i]) / 2) * hann[i]; im[i] = 0; }
    fftSimple(re, im);
    for (let k = 2; k < N / 2; k++) {
      const mag = re[k] * re[k] + im[k] * im[k];
      if (mag < 1e-9) continue;
      const freq = (k * sampleRate) / N;
      if (freq < 55 || freq > 2000) continue;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += mag;
    }
  }
  const total = chroma.reduce((a, b) => a + b, 0);
  if (total === 0) return 'Unknown';
  let best = -2, bestName = 'Unknown';
  for (let root = 0; root < 12; root++) {
    for (const [profile, suffix] of [[MAJOR, 'major'], [MINOR, 'minor']] as const) {
      let num = 0, denA = 0, denB = 0;
      for (let i = 0; i < 12; i++) {
        const p = profile[(i - root + 12) % 12];
        num += chroma[i] * p; denA += chroma[i] * chroma[i]; denB += p * p;
      }
      const corr = num / (Math.sqrt(denA * denB) || 1);
      if (corr > best) { best = corr; bestName = `${NOTE_NAMES[root]} ${suffix}`; }
    }
  }
  return bestName;
}

/** Semitone distance to transpose from one key to another (same mode assumed). */
export function semitonesBetween(fromKey: string, toKey: string): number {
  const pc = (k: string) => NOTE_NAMES.indexOf(k.split(' ')[0]);
  const a = pc(fromKey), b = pc(toKey);
  if (a < 0 || b < 0) return 0;
  let d = (b - a) % 12;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}
