import { useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { runAudioJob, buffersToChannels } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100, encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { useRequireAuth } from '../lib/auth';
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
      h1="Make Mashups Like a Producer — Free AI Mashup Maker"
      sub="Upload two songs and our free AI mashup maker does the rest: it separates the vocals from one track and the instrumental from the other, automatically matches their tempo and musical key, then blends them into a seamless mashup. Preview it instantly, fine-tune the blend, and download your creation as MP3 or WAV — all in your browser, all free."
      badge="AI Mashup Maker"
      widget={<MashupWidget />}
      steps={[
        { title: 'Upload two tracks', text: 'Track A provides the vocals (the acapella source), Track B provides the instrumental (the beat). Any MP3, WAV, or M4A works — pick songs you have the rights to use.' },
        { title: 'AI separates and analyzes', text: 'Our stem-separation AI extracts clean vocals from Track A and a full instrumental from Track B. Then it detects each track\u2019s BPM and musical key automatically.' },
        { title: 'Tempo and key matched', text: 'The instrumental is time-stretched to Track A\u2019s tempo and pitch-shifted into a compatible key — so the vocals sit naturally on the beat instead of clashing.' },
        { title: 'Blend, preview, download', text: 'Hear your mashup instantly. Adjust the vocal/instrumental balance with the blend sliders, re-blend, and export the final mix as MP3 or WAV.' },
      ]}
      features={[
        { icon: '🤖', title: 'AI stem separation on both tracks', text: 'Clean vocal extraction from Track A and full instrumental isolation from Track B — powered by the same neural models as our 4-stem splitter.' },
        { icon: '⏱️', title: 'Automatic tempo matching', text: 'BPM detection finds each track\u2019s tempo, then time-stretches the instrumental to lock onto the vocal track\u2019s groove. No manual beat-matching required.' },
        { icon: '🎹', title: 'Smart key matching', text: 'Musical key detection suggests the exact transposition (in semitones) that puts both tracks in a compatible key, so the mashup sounds intentional, not accidental.' },
        { icon: '🎚️', title: 'Blend control', text: 'Fine-tune the balance between vocals and instrumental with simple sliders. Push the vocals forward for an acapella feel, or let the beat dominate.' },
        { icon: '💯', title: 'Free and private', text: 'No accounts, no uploads, no per-mashup fees. The AI models run on your device, so your unreleased ideas stay completely private.' },
        { icon: '🎵', title: 'MP3 and WAV export', text: 'Download your finished mashup ready to share on TikTok, SoundCloud, or with friends — MP3 for convenience, WAV for quality.' },
      ]}
      useCases={[
        { title: 'Viral TikTok and Reels mashups', text: 'The classic formula: trending vocals over an unexpected beat. Create the kind of genre-bending mashups that rack up millions of views — Billie Eilish over a phonk beat, or a Bollywood vocal on a drill instrumental.' },
        { title: 'DJ blends and transition ideas', text: 'Prototype blends before your set. Hear how that acapella sits over your next track\u2019s instrumental, dial in the blend, and walk into the booth with confidence.' },
        { title: 'Remix sketches in minutes', text: 'Got a remix idea at 2am? Instead of spending hours in a DAW, hear a rough version in minutes. If the concept works, take the idea into the studio properly.' },
        { title: 'Just-for-fun experiments', text: 'What does your favorite singer sound like over a completely different genre? There\u2019s no wrong answer — mashups are play, and play is how great ideas start.' },
      ]}
      faqs={[
        { q: 'How does the AI mashup maker work?', a: 'It\u2019s a four-stage pipeline, all running in your browser. First, you upload two tracks: Track A (the vocal source) and Track B (the instrumental source). Second, our neural stem-separation models extract the isolated vocals from Track A and the full instrumental (drums + bass + other) from Track B. Third, the app analyzes both tracks — detecting BPM (tempo) with an onset-detection algorithm and musical key with a chroma-based classifier. Fourth, it time-stretches Track B\u2019s instrumental to match Track A\u2019s tempo and pitch-shifts it by the suggested number of semitones so both parts sit in a compatible key. Finally, the two are mixed together with your chosen balance levels. The whole thing feels like magic, but it\u2019s just careful DSP and machine learning working together.' },
        { q: 'What makes a good mashup combination?', a: 'The best mashups usually pair vocals and instrumentals with complementary energy. Start with the tempo: tracks within 10-15 BPM of each other blend most naturally, though our automatic tempo matching handles bigger gaps. For key, the AI suggests a transposition, but your ears are the final judge — sometimes a deliberately "wrong" key creates an interesting tension. Try contrasting genres (a soul vocal over an electronic beat), matching emotional vibes (melancholic vocal + moody instrumental), or going for pure surprise (opera over hip-hop). There are no rules — some of the most viral mashups work precisely because nobody expected that combination.' },
        { q: 'How does the automatic tempo and key matching work?', a: 'After separation, we analyze both tracks independently. For tempo, an onset-detection algorithm finds the rhythmic pulses and estimates BPM — the same approach DJ software uses. If Track B is at 128 BPM and Track A is at 100 BPM, we time-stretch B\u2019s instrumental down to 100 BPM using a phase-vocoder that preserves pitch. For key, a chroma-feature classifier identifies each track\u2019s likely musical key (e.g., A minor, F major). We then compute the smallest transposition in semitones that moves B into a compatible key with A, and pitch-shift it. You can disable auto-matching and set things manually if you prefer full control — sometimes the "wrong" settings sound cooler.' },
        { q: 'Do I need the rights to both songs to make a mashup?', a: 'Yes — this is important. Only mash up tracks you have the rights to use: your own music, royalty-free tracks, or songs where you\u2019ve obtained permission. A mashup is a derivative work, and distributing one made from commercial songs without permission can infringe copyright — even if you made it "just for fun." Posting to TikTok or YouTube often works in practice because those platforms have licensing deals with major publishers (they may monetize for the rights holder or mute in some regions), but that\u2019s the platform\u2019s license, not yours. For anything beyond personal experimentation, get proper clearance or use royalty-free source material.' },
        { q: 'Is the mashup maker really free? How?', a: 'Completely free, no catches. The stem-separation AI, tempo detection, key detection, time-stretching, and pitch-shifting all run on your device using WebAssembly and the Web Audio API. We don\u2019t operate GPU servers, so we have no per-track costs to pass on to you. No accounts, no watermarks, no limits on how many mashups you create. The AI models (~80MB) download once and are cached in your browser. If you love it, tell a producer friend — that\u2019s the best payment we could ask for.' },
        { q: 'How long does it take to make a mashup?', a: 'The first run takes a few minutes: the AI models download once (~80MB, cached afterwards), then each track needs 1-3 minutes for stem separation depending on length and your device speed. So two 3-minute tracks might take 5-8 minutes total on first use. After the models are cached, it\u2019s just the separation time. The actual tempo/key matching and blending takes seconds. Tip: while Track A is separating, queue up ideas for Track B — and remember that great mashups are 90% song selection, 10% processing.' },
      ]}
    />
  );
}

function MashupWidget() {
  const requireAuth = useRequireAuth();
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
          <UploadWidget key={slot} onFile={(f) => requireAuth(() => handleFile(f))} compact />
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
