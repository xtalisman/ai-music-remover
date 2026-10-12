// Generates demo audio samples in public/samples/.
// Creates an original synthesized musical phrase and its stems:
// vocals (melody), music (bass+chords), other (drums), custom (alternate mix).
// Run via `npm run prebuild` (also runs prepare-lame.mjs).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'samples');
const SR = 44100;
const DUR = 8; // seconds
const N = SR * DUR;

// Simple chord progression: C - Am - F - G (2s each)
const CHORDS = [
  [261.63, 329.63, 392.0],   // C major
  [220.0, 261.63, 329.63],    // A minor
  [174.61, 220.0, 261.63],    // F major
  [196.0, 246.94, 392.0],     // G major
];
const MELODY = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0]; // 1 per second

function writeWav(filePath, left, right) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, left[i] * 32767)), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, right[i] * 32767)), 44 + i * 4 + 2);
  }
  fs.writeFileSync(filePath, buf);
}

function melodyAt(t) {
  const idx = Math.min(7, Math.floor(t));
  const f = MELODY[idx];
  // vibrato + envelope
  const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5 * t);
  const env = Math.min(1, (t % 1) * 10) * Math.min(1, (1 - (t % 1)) * 5 + 0.2);
  return Math.sin(2 * Math.PI * f * vib * t) * 0.35 * env;
}

function chordAt(t) {
  const idx = Math.min(3, Math.floor(t / 2));
  const chord = CHORDS[idx];
  let v = 0;
  for (const f of chord) v += Math.sin(2 * Math.PI * f * t) * 0.12;
  return v;
}

function bassAt(t) {
  const idx = Math.min(3, Math.floor(t / 2));
  const f = CHORDS[idx][0] / 2;
  return Math.sin(2 * Math.PI * f * t) * 0.25;
}

function drumsAt(t) {
  const beat = t % 0.5;
  const kick = beat < 0.1 ? Math.sin(2 * Math.PI * 60 * beat) * Math.exp(-beat * 30) * 0.5 : 0;
  const hat = (t % 0.25) < 0.05 ? (Math.random() * 2 - 1) * Math.exp(-((t % 0.25)) * 80) * 0.15 : 0;
  return kick + hat;
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const vocalsL = new Float32Array(N), vocalsR = new Float32Array(N);
const musicL = new Float32Array(N), musicR = new Float32Array(N);
const otherL = new Float32Array(N), otherR = new Float32Array(N);

for (let i = 0; i < N; i++) {
  const t = i / SR;
  const v = melodyAt(t);
  const m = chordAt(t) + bassAt(t);
  const d = drumsAt(t);
  vocalsL[i] = vocalsR[i] = v;
  musicL[i] = musicR[i] = m;
  otherL[i] = otherR[i] = d;
}

// original = full mix; custom = vocals slightly lower, music slightly higher
const origL = new Float32Array(N), origR = new Float32Array(N);
const custL = new Float32Array(N), custR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  origL[i] = origR[i] = vocalsL[i] + musicL[i] + otherL[i];
  custL[i] = custR[i] = vocalsL[i] * 0.7 + musicL[i] * 1.1 + otherL[i];
}

writeWav(path.join(OUT, 'demo-vocals.wav'), vocalsL, vocalsR);
writeWav(path.join(OUT, 'demo-music.wav'), musicL, musicR);
writeWav(path.join(OUT, 'demo-other.wav'), otherL, otherR);
writeWav(path.join(OUT, 'demo-original.wav'), origL, origR);
writeWav(path.join(OUT, 'demo-custom.wav'), custL, custR);
console.log('Demo samples written to', OUT);
