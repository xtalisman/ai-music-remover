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
      h1="Split any song into 4 stems"
      sub="AI separates your track into vocals, drums, bass and other — then mix them live and download each stem."
      badge="4-Stem AI Splitter"
      widget={<SplitterWidget />}
      steps={[
        { title: 'Upload your track', text: 'Any mixed song in MP3, WAV, M4A or another common format.' },
        { title: 'AI splits the stems', text: 'Four neural models estimate the vocals, drums, bass and everything else.' },
        { title: 'Mix and download', text: 'Mute, solo and balance the stems in the live mixer, then export WAVs or a ZIP.' },
      ]}
      features={[
        { icon: '🎚️', title: 'Live stem mixer', text: 'Balance the four stems with per-stem volume, mute and solo — hear it instantly.' },
        { icon: '🤖', title: 'Dedicated models', text: 'Each stem gets its own trained neural network for cleaner separation.' },
        { icon: '💯', title: 'Free, no sign-up', text: 'Split unlimited tracks. No accounts, no watermarks, no catch.' },
        { icon: '🔒', title: 'On-device processing', text: 'Your music never leaves your browser. Private by architecture.' },
        { icon: '📦', title: 'One-click ZIP', text: 'Download all four stems together, perfectly time-aligned.' },
        { icon: '🎛️', title: 'DAW-ready WAVs', text: '44.1kHz stems drop straight into any DAW or video editor.' },
      ]}
      useCases={[
        { title: 'Remix and sample', text: 'Pull isolated drums or basslines for flips, remixes and sample packs.' },
        { title: 'Learn parts by ear', text: 'Solo the bass or drums to transcribe tricky parts note for note.' },
        { title: 'Create backing tracks', text: 'Mute the vocals (or the lead instrument) for custom practice tracks.' },
        { title: 'Restore and rebalance', text: 'Fix an unbalanced mix by rebalancing stems from a finished bounce.' },
      ]}
      faqs={[
        { q: 'What are the 4 stems?', a: 'Vocals, drums, bass, and "other" (everything else: guitars, keys, synths, effects). Each is estimated by its own AI model.' },
        { q: 'How good is the separation?', a: 'Very good on typical mixes. The four stems reconstruct the original almost perfectly, which means little is lost — though faint bleed between similar sounds is normal.' },
        { q: 'Can I use the stems commercially?', a: 'The stems are derived from your upload — you need the rights to the original recording. Separation doesn\u2019t grant new rights.' },
        { q: 'Why does the first run take longer?', a: 'Your browser downloads the four AI models (~80MB total) on first use, then caches them. Later runs start instantly and even work offline.' },
        { q: 'Is there a file length limit?', a: 'We recommend up to 10 minutes for smooth processing. Longer files work but need more memory and time.' },
      ]}
    />
  );
}
