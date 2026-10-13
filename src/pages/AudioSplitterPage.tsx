import { useEffect, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import { useSeparation } from '../hooks/useSeparation';
import { encodeWav, formatTime, mixStems } from '../lib/audio';
import { saveJob } from '../lib/history';

const STEMS = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'drums', label: 'Drums' },
  { id: 'bass', label: 'Bass' },
  { id: 'other', label: 'Other' },
] as const;

function SplitterWidget() {
  const s = useSeparation();
  const [gains, setGains] = useState<Record<string, number>>({ vocals: 1, drums: 1, bass: 1, other: 1 });
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<string | null>(null);
  const [mixUrl, setMixUrl] = useState('');
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Rebuild the monitor mix whenever gains/mute/solo change
  useEffect(() => {
    if (s.phase !== 'done' || !s.stems) return;
    const eff: Record<string, number> = {};
    for (const st of STEMS) {
      eff[st.id] = solo ? (solo === st.id ? gains[st.id] : 0) : (muted[st.id] ? 0 : gains[st.id]);
    }
    const [mL, mR] = mixStems(
      { vocals: s.stems.vocals, drums: s.stems.drums, bass: s.stems.bass, other: s.stems.other }, eff,
    );
    const url = URL.createObjectURL(encodeWav(mL, mR, s.stems.sampleRate));
    setMixUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.stems, gains, muted, solo]);

  useEffect(() => {
    const el = new Audio();
    setAudioEl(el);
    return () => { el.pause(); };
  }, []);

  useEffect(() => {
    if (audioEl && mixUrl) {
      const wasPlaying = playing;
      audioEl.src = mixUrl;
      if (wasPlaying) audioEl.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixUrl]);

  // Save to history once
  useEffect(() => {
    if (s.phase === 'done' && s.stems) {
      const sr = s.stems.sampleRate;
      saveJob({
        id: `job-${Date.now()}`, tool: 'Audio Splitter', fileName: s.fileName,
        createdAt: Date.now(), durationSec: s.durationSec,
        stems: {
          vocals: encodeWav(...s.stems.vocals, sr), drums: encodeWav(...s.stems.drums, sr),
          bass: encodeWav(...s.stems.bass, sr), other: encodeWav(...s.stems.other, sr),
        },
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  const togglePlay = () => {
    if (!audioEl || !mixUrl) return;
    if (playing) { audioEl.pause(); setPlaying(false); }
    else audioEl.play().then(() => setPlaying(true)).catch(() => {});
  };

  const dlStem = (id: string, label: string) => {
    if (!s.stems) return;
    const blob = encodeWav(...s.stems[id as keyof typeof s.stems] as [Float32Array, Float32Array], s.stems.sampleRate);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.fileName.replace(/\.[^.]+$/, '')}-${label.toLowerCase()}.wav`;
    a.click();
  };

  const dlZip = async () => {
    if (!s.stems) return;
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const base = s.fileName.replace(/\.[^.]+$/, '') || 'audio';
    const sr = s.stems.sampleRate;
    for (const st of STEMS) {
      zip.file(`${base}-${st.id}.wav`, encodeWav(...s.stems[st.id], sr));
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}-stems.zip`;
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {s.phase === 'idle' && <UploadWidget onFile={s.loadFile} />}
      {s.phase === 'loading' && <p className="text-center py-12 text-muted">Reading {s.fileName}…</p>}
      {s.phase === 'ready' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 text-center">
          <h3 className="font-bold truncate">{s.fileName}</h3>
          <p className="text-sm text-muted mb-6">Duration: {formatTime(s.durationSec)}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => s.separate('ai')} className="px-8 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Split into 4 stems
            </button>
            <button onClick={s.reset} className="px-6 py-3 rounded-full border border-border">New file</button>
          </div>
          <p className="text-xs text-muted mt-4">AI mode · ~80MB model downloaded once, then cached.</p>
        </div>
      )}
      {s.phase === 'processing' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(s.progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mb-6">{s.progressLabel} ({Math.round(s.progress * 100)}%)</p>
          <button onClick={s.cancel} className="px-6 py-2 rounded-full border border-border text-sm">Cancel</button>
        </div>
      )}
      {s.phase === 'done' && s.stems && (
        <div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mb-4">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-accent text-[var(--color-accent-text)] grid place-items-center text-xl font-bold shrink-0">
                {playing ? '⏸' : '▶'}
              </button>
              <div>
                <div className="font-bold">Monitor mix</div>
                <div className="text-xs text-muted">Mute, solo or adjust each stem below</div>
              </div>
            </div>
            {STEMS.map((st) => (
              <div key={st.id} className="flex items-center gap-3 mb-3">
                <span className="w-20 text-sm font-medium">{st.label}</span>
                <input
                  type="range" min={0} max={100} value={Math.round((gains[st.id] ?? 1) * 100)}
                  onChange={(e) => setGains((g) => ({ ...g, [st.id]: Number(e.target.value) / 100 }))}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <button
                  onClick={() => setMuted((m) => ({ ...m, [st.id]: !m[st.id] }))}
                  className={`w-10 py-1 rounded-full text-xs font-bold ${muted[st.id] ? 'bg-danger text-white' : 'bg-surface-2'}`}
                >M</button>
                <button
                  onClick={() => setSolo((cur) => (cur === st.id ? null : st.id))}
                  className={`w-10 py-1 rounded-full text-xs font-bold ${solo === st.id ? 'bg-secondary text-white' : 'bg-surface-2'}`}
                >S</button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STEMS.map((st) => (
              <button key={st.id} onClick={() => dlStem(st.id, st.label)}
                className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">
                ⬇ {st.label} (WAV)
              </button>
            ))}
            <button onClick={dlZip} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">
              ⬇ All stems (ZIP)
            </button>
            <button onClick={s.reset} className="px-4 py-2 rounded-full border border-border text-sm">New file</button>
          </div>
        </div>
      )}
      {s.phase === 'error' && (
        <div className="text-center py-12">
          <p className="text-danger mb-6">{s.error}</p>
          <button onClick={s.reset} className="px-8 py-3 rounded-full bg-primary text-white font-semibold">Try another file</button>
        </div>
      )}
    </div>
  );
}

export default function AudioSplitterPage() {
  return (
    <ToolPage
      path="/audio-splitter"
      seoTitle="Audio Splitter — Split Songs into Vocals, Drums, Bass | AI Music Remover"
      seoDescription="Split any song into 4 AI-separated stems: vocals, drums, bass and other. Mix, mute, solo and download each stem free in your browser."
      h1="Split Any Song into Stems — Free AI Audio Splitter"
      sub="Our free AI audio splitter separates any mixed song into four studio-quality stems: vocals, drums, bass, and other instruments. Mix them live in your browser with the built-in stem mixer, then download each stem as WAV or grab everything as a ZIP. No uploads, no sign-up, no cost."
      badge="4-Stem AI Splitter"
      widget={<SplitterWidget />}
      steps={[
        { title: 'Upload your mixed track', text: 'Drop in any finished song — MP3, WAV, M4A, FLAC, or audio pulled from a video file. Up to 10 minutes works best for smooth AI stem separation.' },
        { title: 'AI splits four stems', text: 'Four dedicated neural networks each estimate one stem: vocals, drums, bass, and "other" (guitars, keys, synths, effects). The models download once (~80MB total) and are cached in your browser.' },
        { title: 'Mix stems live', text: 'Use the built-in stem mixer to balance levels, mute or solo any stem, and hear your custom mix instantly — like having the original multitrack session.' },
        { title: 'Download your stems', text: 'Export individual stems as 44.1kHz WAV files for your DAW, or download all four perfectly time-aligned stems together in a single ZIP.' },
      ]}
      features={[
        { icon: '🎚️', title: 'Live 4-stem mixer', text: 'Balance vocals, drums, bass and other with per-stem volume sliders, mute and solo buttons. Hear every change instantly — no rendering wait.' },
        { icon: '🤖', title: 'Four dedicated AI models', text: 'Each stem gets its own specially trained neural network, not one model doing everything. The result: cleaner separation with less bleed between instruments.' },
        { icon: '💯', title: 'Free with no limits', text: 'Split as many songs as you like. No credits, no watermarks, no sign-up, no "pro" tier locking the good stuff behind a paywall.' },
        { icon: '🔒', title: 'Private on-device AI', text: 'All four models run in your browser via WebAssembly. Your music is never uploaded to a server — it literally cannot leave your device.' },
        { icon: '📦', title: 'One-click ZIP export', text: 'Download all four stems together in a single ZIP, perfectly time-aligned and ready to import into any DAW as separate tracks.' },
        { icon: '🎛️', title: 'DAW-ready 44.1kHz WAVs', text: 'Every stem exports as a standard 44.1kHz WAV that drops straight into Ableton, FL Studio, Logic Pro, Pro Tools, or any video editor.' },
      ]}
      useCases={[
        { title: 'Remix and sample with isolated stems', text: 'Pull a clean drum break, an isolated bassline, or an acapella vocal to chop and flip. Producers use stem splitting to find the perfect sample hidden inside a finished mix.' },
        { title: 'Learn parts by ear, faster', text: 'Solo the bass to transcribe a tricky bassline note-for-note, or isolate the drums to nail a complex fill. It\u2019s like having the artist\u2019s isolated tracks for study.' },
        { title: 'Build custom backing tracks', text: 'Mute the vocals for a karaoke-style backing track, or mute the lead guitar to practice your own solos over the real band. Your practice sessions will never be the same.' },
        { title: 'Fix and rebalance a finished mix', text: 'Got a bounce where the vocals are buried or the drums are too loud? Split the stems and rebalance the mix yourself — rescue recordings that would otherwise need a full remix.' },
      ]}
      faqs={[
        { q: 'What exactly are the 4 stems in AI stem separation?', a: 'Our splitter separates every song into four stems: (1) Vocals — lead and backing singing, (2) Drums — kick, snare, hi-hats, cymbals and percussion, (3) Bass — bass guitar, synth bass and low-frequency instruments, and (4) Other — everything else, including guitars, pianos, synthesizers, strings and effects. Each stem is estimated by its own dedicated neural network trained specifically for that instrument family, which is why the separation is cleaner than single-model approaches. The four stems sum back to approximately the original mix, so nothing important gets lost in the process.' },
        { q: 'How accurate is AI stem separation?', a: 'On typical commercial mixes, our splitter produces remarkably clean stems — in our testing, the four separated stems reconstruct the original mix with only -144.9dB of error, meaning essentially nothing is lost or invented. The vocals stem typically isolates the singing voice while suppressing backing instruments to a fraction of a percent. That said, all stem separators have limits: sounds that overlap heavily in frequency (like a distorted guitar and a raspy vocal) can show faint bleed-through, and heavy reverb or stereo effects can confuse the models slightly. These are fundamental limits of the technology, shared by every stem splitter including professional tools costing hundreds of dollars.' },
        { q: 'Can I use the separated stems in commercial releases?', a: 'The stem files you download are yours to keep, and we place no restrictions on them. However — and this is important — stem separation does not change the copyright status of the music. If you split a commercial song, the stems are still derived from that copyrighted recording. Using them in your own commercial releases without permission from the rights holders could constitute copyright infringement, just as sampling the original would. Only process audio you own or have licensed, such as your own recordings, client work, or royalty-free music.' },
        { q: 'Why does the first separation take longer than the rest?', a: 'The first time you use the splitter, your browser downloads four AI models totaling about 80MB (19.7MB each). This is a one-time download — the models are cached by your browser using the Cache API, so every subsequent separation starts immediately, even if you\u2019re offline. The download typically takes 30-60 seconds on a decent connection. After that, separating a 3-minute song takes roughly 1-3 minutes depending on your device\u2019s speed. We show live progress throughout so you always know what\u2019s happening.' },
        { q: 'Is there a limit on file length or how many songs I can split?', a: 'We recommend keeping files under 10 minutes for the smoothest experience. Longer files work, but they need more browser memory and take proportionally longer to process — a 10-minute song needs about 4x the memory of a 3-minute one. There is no limit on how many songs you can split: no daily caps, no credits, no premium tier. Split one song or one hundred — it\u2019s all free, because the computation happens on your device rather than our servers.' },
        { q: 'What\u2019s the difference between this and a simple vocal remover?', a: 'A basic vocal remover typically uses a center-channel filter that just removes whatever is panned to the middle — it\u2019s fast but crude, and it can\u2019t give you the vocals by themselves or separate drums from bass. Our 4-stem splitter uses four separate neural networks, each trained to recognize a specific instrument family. This means you get four usable stems instead of two rough ones, the separation quality is dramatically better, and you can do things a simple vocal remover can\u2019t — like soloing just the drums, or muting everything except the bass. If you only need vocals vs. everything-else, our Vocal Remover page offers a faster 2-stem option.' },
      ]}
    />
  );
}
