import { useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { runAudioJob, buffersToChannels } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100, encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { detectBpm, detectKey, semitonesBetween } from '../workers/analysis';

interface TrackData {
  fileName: string;
  vocals: [Float32Array, Float32Array];
  instrumental: [Float32Array, Float32Array];
  bpm: number;
  key: string;
  duration: number;
}

type Phase = 'idle' | 'working' | 'ready' | 'mixing' | 'done' | 'error';

export default function MashupMakerPage() {
  return (
    <ToolPage
      path="/ai-mashup-maker"
      seoTitle="AI Mashup Maker — Blend Vocals & Instrumentals Free | AI Music Remover"
      seoDescription="Create mashups in your browser: AI separates both tracks, matches tempo and key automatically, and blends vocals over a new instrumental. Free."
      h1="Make mashups like a producer"
      sub="Upload two songs — AI takes the vocals from one and lays them over the instrumental of the other, matched in tempo and key."
      badge="AI Mashup Maker"
      widget={<MashupWidget />}
      steps={[
        { title: 'Upload two tracks', text: 'Track A provides the vocals, track B provides the instrumental.' },
        { title: 'AI analyzes & matches', text: 'Both tracks are separated, then tempo and key are detected and matched automatically.' },
        { title: 'Preview & download', text: 'Hear your mashup instantly, tweak the blend, and export MP3 or WAV.' },
      ]}
      features={[
        { icon: '🤖', title: 'AI stem separation', text: 'Clean vocal and instrumental extraction from both tracks.' },
        { icon: '⏱️', title: 'Automatic tempo match', text: 'BPM detection aligns both tracks to the same tempo.' },
        { icon: '🎹', title: 'Key matching', text: 'Pitch detection suggests the transposition that puts both tracks in key.' },
        { icon: '🎚️', title: 'Blend control', text: 'Balance vocals against the instrumental to taste.' },
        { icon: '💯', title: 'Free & private', text: 'No accounts, no uploads — everything happens on your device.' },
        { icon: '🎵', title: 'MP3/WAV export', text: 'Download your mashup ready to share.' },
      ]}
      useCases={[
        { title: 'Viral mashups', text: 'Combine trending vocals with unexpected instrumentals for social content.' },
        { title: 'DJ blends', text: 'Prototype blends and transitions before your set.' },
        { title: 'Remix sketches', text: 'Quickly hear how an acapella sits over a different beat.' },
        { title: 'Fun experiments', text: 'Hear your favorite singer over a completely different genre.' },
      ]}
      faqs={[
        { q: 'How does the tempo matching work?', a: 'We detect the BPM of both tracks, then time-stretch the instrumental to the vocal track\u2019s tempo without changing its pitch.' },
        { q: 'What if the keys clash?', a: 'Key detection suggests a transposition in semitones. Apply it to the instrumental so both parts sit in a compatible key.' },
        { q: 'Do I need the rights to both songs?', a: 'Yes — only mash up tracks you have the rights to use. This tool is for personal, educational and properly licensed creative work.' },
        { q: 'Is it free?', a: 'Completely. The AI models run on your device, so there are no per-track costs.' },
        { q: 'How long does it take?', a: 'Separating two tracks takes a few minutes on first run (models download once). Mixing itself is fast.' },
      ]}
    />
  );
}

function MashupWidget() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [trackA, setTrackA] = useState<TrackData | null>(null);
  const [trackB, setTrackB] = useState<TrackData | null>(null);
  const [error, setError] = useState('');
  const [vocalGain, setVocalGain] = useState(1);
  const [instGain, setInstGain] = useState(0.9);
  const [autoMatch, setAutoMatch] = useState(true);
  const [mixUrl, setMixUrl] = useState('');
  const [mixAudio, setMixAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const [slot, setSlot] = useState<'A' | 'B'>('A');

  const processTrack = async (file: File): Promise<TrackData> => {
    const { left, right, sampleRate, duration } = await decodeAudioFile(file);
    const [rL, rR] = await resampleTo44100(left, right, sampleRate);
    const job = runAudioJob('separate', { left: rL.slice(), right: rR.slice() },
      (f, label) => { setProgress(f * 0.45); setStatus(label); });
    const res = await job.promise;
    if (res.kind === 'audio') throw new Error('separation failed');
    const get = (n: string): [Float32Array, Float32Array] => buffersToChannels(res.stems[n]);
    const vocals = get('vocals');
    const drums = get('drums'), bass = get('bass'), other = get('other');
    const instrumental: [Float32Array, Float32Array] = [
      new Float32Array(rL.length), new Float32Array(rL.length),
    ];
    for (let i = 0; i < rL.length; i++) {
      instrumental[0][i] = drums[0][i] + bass[0][i] + other[0][i];
      instrumental[1][i] = drums[1][i] + bass[1][i] + other[1][i];
    }
    const mono = new Float32Array(rL.length);
    for (let i = 0; i < mono.length; i++) mono[i] = (rL[i] + rR[i]) / 2;
    const bpm = detectBpm(mono, 44100);
    const key = detectKey(rL, rR, 44100);
    return { fileName: file.name, vocals, instrumental, bpm, key, duration };
  };

  const handleFile = async (file: File) => {
    setError('');
    setPhase('working');
    try {
      setStatus(`Separating track ${slot}…`);
      const track = await processTrack(file);
      setProgress(0.5);
      setStatus('Analyzing tempo & key…');
      const a = slot === 'A' ? track : trackA;
      const b = slot === 'B' ? track : trackB;
      if (slot === 'A') { setTrackA(track); setSlot('B'); }
      else setTrackB(track);
      setPhase(a && b ? 'ready' : 'idle');
      setProgress(0);
    } catch (e) {
      setError(`Failed: ${(e as Error).message}`);
      setPhase('error');
    }
  };

  const buildMix = async () => {
    if (!trackA || !trackB) return;
    setPhase('mixing');
    try {
      let [iL, iR] = [trackB.instrumental[0].slice(), trackB.instrumental[1].slice()];
      if (autoMatch) {
        // tempo match B -> A
        if (trackA.bpm > 0 && trackB.bpm > 0 && Math.abs(trackA.bpm - trackB.bpm) > 1) {
          const rate = trackB.bpm / trackA.bpm; // >1 means B faster -> slow it down
          setStatus(`Matching tempo (${trackB.bpm} → ${trackA.bpm} BPM)…`);
          const job = runAudioJob('timeStretch', { left: iL, right: iR, rate },
            (f, label) => { setProgress(f * 0.4); setStatus(label); });
          const res = await job.promise;
          if (res.kind !== 'audio') throw new Error('tempo match failed');
          iL = new Float32Array(res.left); iR = new Float32Array(res.right);
        }
        // key match B -> A
        const st = semitonesBetween(trackB.key, trackA.key);
        if (st !== 0) {
          setStatus(`Matching key (${trackB.key} → ${trackA.key}, ${st > 0 ? '+' : ''}${st} st)…`);
          const job = runAudioJob('pitchShift', { left: iL, right: iR, semitones: st },
            (f, label) => { setProgress(0.4 + f * 0.4); setStatus(label); });
          const res = await job.promise;
          if (res.kind !== 'audio') throw new Error('key match failed');
          iL = new Float32Array(res.left); iR = new Float32Array(res.right);
        }
      }
      setStatus('Blending…');
      setProgress(0.85);
      const n = Math.min(trackA.vocals[0].length, iL.length);
      const mL = new Float32Array(n), mR = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        mL[i] = trackA.vocals[0][i] * vocalGain + iL[i] * instGain;
        mR[i] = trackA.vocals[1][i] * vocalGain + iR[i] * instGain;
      }
      setMixAudio([mL, mR]);
      const url = URL.createObjectURL(encodeWav(mL, mR, 44100));
      setMixUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
      setProgress(1);
      setPhase('done');
    } catch (e) {
      setError(`Mix failed: ${(e as Error).message}`);
      setPhase('error');
    }
  };

  const reblend = () => {
    if (!trackA || !trackB || !mixAudio) return;
    // quick re-blend with new gains (uses last matched instrumental length)
    buildMix();
  };

  const download = async (fmt: 'wav' | 'mp3') => {
    if (!mixAudio) return;
    const blob = fmt === 'wav' ? encodeWav(mixAudio[0], mixAudio[1], 44100)
      : await encodeMp3(mixAudio[0], mixAudio[1], 44100);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mashup.${fmt}`;
    a.click();
  };

  const reset = () => {
    setPhase('idle'); setTrackA(null); setTrackB(null); setSlot('A');
    setMixUrl(''); setMixAudio(null); setError('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {(phase === 'idle') && (
        <div>
          <h3 className="font-bold text-center mb-4">
            {!trackA ? 'Step 1: upload Track A (vocals)' : 'Step 2: upload Track B (instrumental)'}
          </h3>
          {trackA && (
            <p className="text-sm text-center text-muted mb-4">
              ✓ Track A: {trackA.fileName} ({trackA.bpm || '?'} BPM, {trackA.key})
            </p>
          )}
          <UploadWidget key={slot} onFile={handleFile} compact />
          {trackA && (
            <div className="text-center mt-3">
              <button onClick={() => { setTrackA(null); setSlot('A'); }} className="text-sm text-muted underline">Replace track A</button>
            </div>
          )}
        </div>
      )}
      {phase === 'working' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted">{status} ({Math.round(progress * 100)}%)</p>
        </div>
      )}
      {phase === 'ready' && trackA && trackB && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="rounded-2xl bg-background border border-border p-4">
              <div className="font-bold mb-1">Track A — vocals</div>
              <div className="text-muted truncate">{trackA.fileName}</div>
              <div className="text-muted">{trackA.bpm || '?'} BPM · {trackA.key} · {formatTime(trackA.duration)}</div>
            </div>
            <div className="rounded-2xl bg-background border border-border p-4">
              <div className="font-bold mb-1">Track B — instrumental</div>
              <div className="text-muted truncate">{trackB.fileName}</div>
              <div className="text-muted">{trackB.bpm || '?'} BPM · {trackB.key} · {formatTime(trackB.duration)}</div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm mb-6">
            <input type="checkbox" checked={autoMatch} onChange={(e) => setAutoMatch(e.target.checked)} className="accent-[var(--color-primary)]" />
            Auto-match tempo &amp; key of B to A
          </label>
          <div className="flex gap-3">
            <button onClick={buildMix} className="flex-1 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Create mashup
            </button>
            <button onClick={reset} className="px-6 py-3 rounded-full border border-border">Start over</button>
          </div>
        </div>
      )}
      {phase === 'mixing' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted">{status}</p>
        </div>
      )}
      {phase === 'done' && mixUrl && (
        <div>
          <ResultPlayer tracks={[{ id: 'mashup', label: 'Your Mashup', url: mixUrl }]} />
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mt-4">
            <h3 className="font-bold mb-4">Blend</h3>
            <label className="flex items-center gap-3 mb-3 text-sm">
              <span className="w-28 font-medium">Vocals (A)</span>
              <input type="range" min={0} max={150} value={Math.round(vocalGain * 100)}
                onChange={(e) => setVocalGain(Number(e.target.value) / 100)} className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-12 text-right text-muted">{Math.round(vocalGain * 100)}%</span>
            </label>
            <label className="flex items-center gap-3 mb-4 text-sm">
              <span className="w-28 font-medium">Instrumental (B)</span>
              <input type="range" min={0} max={150} value={Math.round(instGain * 100)}
                onChange={(e) => setInstGain(Number(e.target.value) / 100)} className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-12 text-right text-muted">{Math.round(instGain * 100)}%</span>
            </label>
            <button onClick={reblend} className="px-6 py-2 rounded-full bg-secondary text-white text-sm font-semibold">
              Re-blend with these levels
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => download('mp3')} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">⬇ Mashup (MP3)</button>
            <button onClick={() => download('wav')} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ Mashup (WAV)</button>
            <button onClick={reset} className="px-4 py-2 rounded-full border border-border text-sm">Start over</button>
          </div>
        </div>
      )}
      {phase === 'error' && (
        <div className="text-center py-12">
          <p className="text-danger mb-6">{error}</p>
          <button onClick={reset} className="px-8 py-3 rounded-full bg-primary text-white font-semibold">Start over</button>
        </div>
      )}
    </div>
  );
}
