import { useEffect, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { useSeparation } from '../hooks/useSeparation';
import { runAudioJob, buffersToChannels } from '../lib/workerClient';
import { encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { saveJob } from '../lib/history';

function KaraokeWidget() {
  const s = useSeparation();
  const [semitones, setSemitones] = useState(0);
  const [tempo, setTempo] = useState(1);
  const [processingFx, setProcessingFx] = useState(false);
  const [fxLabel, setFxLabel] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [finalAudio, setFinalAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const [encoding, setEncoding] = useState(false);

  const applyFx = async () => {
    if (!s.stems) return;
    setProcessingFx(true);
    try {
      let [l, r] = [s.stems.instrumental[0].slice(), s.stems.instrumental[1].slice()];
      if (Math.abs(semitones) > 0.01) {
        setFxLabel(`Shifting key by ${semitones > 0 ? '+' : ''}${semitones} semitones…`);
        const job = runAudioJob('pitchShift', { left: l, right: r, semitones }, (f, label) => setFxLabel(`${label} (${Math.round(f * 100)}%)`));
        const res = await job.promise;
        if (res.kind !== 'audio') throw new Error('pitch shift failed');
        l = new Float32Array(res.left); r = new Float32Array(res.right);
      }
      if (Math.abs(tempo - 1) > 0.005) {
        setFxLabel(`Changing tempo to ${tempo.toFixed(2)}×…`);
        const job = runAudioJob('timeStretch', { left: l, right: r, rate: 1 / tempo }, (f, label) => setFxLabel(`${label} (${Math.round(f * 100)}%)`));
        const res = await job.promise;
        if (res.kind !== 'audio') throw new Error('tempo change failed');
        l = new Float32Array(res.left); r = new Float32Array(res.right);
      }
      setFinalAudio([l, r]);
      const url = URL.createObjectURL(encodeWav(l, r, s.stems.sampleRate));
      setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    } catch (e) {
      alert(`Effect failed: ${(e as Error).message}`);
    } finally {
      setProcessingFx(false);
    }
  };

  // When stems first arrive, the track is the plain instrumental
  useEffect(() => {
    if (s.phase === 'done' && s.stems && !trackUrl) {
      const [l, r] = s.stems.instrumental;
      setFinalAudio([l.slice(), r.slice()]);
      setTrackUrl(URL.createObjectURL(encodeWav(l, r, s.stems.sampleRate)));
      saveJob({
        id: `job-${Date.now()}`, tool: 'Karaoke Maker', fileName: s.fileName,
        createdAt: Date.now(), durationSec: s.durationSec,
        stems: { karaoke: encodeWav(l, r, s.stems.sampleRate) },
      }).catch(() => {});
    }
    if (s.phase === 'idle') { setTrackUrl(''); setFinalAudio(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.stems]);

  const download = async (fmt: 'wav' | 'mp3') => {
    if (!finalAudio || !s.stems) return;
    setEncoding(true);
    try {
      const base = s.fileName.replace(/\.[^.]+$/, '') || 'karaoke';
      const blob = fmt === 'wav'
        ? encodeWav(finalAudio[0], finalAudio[1], s.stems.sampleRate)
        : await encodeMp3(finalAudio[0], finalAudio[1], s.stems.sampleRate);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-karaoke.${fmt}`;
      a.click();
    } finally {
      setEncoding(false);
    }
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
              Make karaoke track
            </button>
            <button onClick={s.reset} className="px-6 py-3 rounded-full border border-border">New file</button>
          </div>
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
      {s.phase === 'done' && trackUrl && (
        <div>
          <ResultPlayer tracks={[{ id: 'karaoke', label: 'Karaoke Track', url: trackUrl }]} />
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mt-4">
            <h3 className="font-bold mb-4">Adjust key &amp; tempo</h3>
            <label className="flex items-center gap-3 mb-3 text-sm">
              <span className="w-24 font-medium">Key</span>
              <input type="range" min={-6} max={6} step={1} value={semitones}
                onChange={(e) => setSemitones(Number(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-20 text-right text-muted">{semitones > 0 ? '+' : ''}{semitones} st</span>
            </label>
            <label className="flex items-center gap-3 mb-4 text-sm">
              <span className="w-24 font-medium">Tempo</span>
              <input type="range" min={0.7} max={1.4} step={0.01} value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-20 text-right text-muted">{tempo.toFixed(2)}×</span>
            </label>
            <button onClick={applyFx} disabled={processingFx}
              className="px-6 py-2 rounded-full bg-secondary text-white text-sm font-semibold disabled:opacity-50">
              {processingFx ? 'Applying…' : 'Apply key & tempo'}
            </button>
            {processingFx && <p className="text-xs text-muted mt-2">{fxLabel}</p>}
          </div>
          <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4 mt-4 text-sm text-muted">
            🎤 <strong>Synced lyrics display</strong> is coming with our AI transcription update —
            lyrics will be generated automatically and highlight line by line.
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => download('mp3')} disabled={encoding}
              className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50">
              ⬇ Karaoke (MP3)
            </button>
            <button onClick={() => download('wav')} disabled={encoding}
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary disabled:opacity-50">
              ⬇ Karaoke (WAV)
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

export default function KaraokeMakerPage() {
  return (
    <ToolPage
      path="/karaoke-maker"
      seoTitle="Karaoke Maker — Remove Vocals & Change Key/Tempo Free | AI Music Remover"
      seoDescription="Turn any song into a karaoke track: AI removes the vocals, then adjust key and tempo. Download MP3 free in your browser."
      h1="Turn any song into a karaoke track"
      sub="AI removes the vocals, you set the key and tempo. Free karaoke tracks in your browser."
      badge="AI Karaoke Maker"
      widget={<KaraokeWidget />}
      steps={[
        { title: 'Upload a song', text: 'Any track in MP3, WAV or M4A — the AI strips the vocals out.' },
        { title: 'Set your key & tempo', text: 'Shift the pitch up or down and adjust the speed to suit your voice.' },
        { title: 'Download & sing', text: 'Export your karaoke track as MP3 or WAV and perform.' },
      ]}
      features={[
        { icon: '🎤', title: 'Clean vocal removal', text: 'AI stem separation isolates the instrumental — better than center-channel tricks.' },
        { icon: '🎹', title: 'Key change', text: 'Shift ±6 semitones to match your vocal range without changing tempo.' },
        { icon: '⏱️', title: 'Tempo control', text: 'Slow it down to practice or speed it up — pitch stays put.' },
        { icon: '💯', title: 'Free forever', text: 'Unlimited karaoke tracks, no accounts, no watermarks.' },
        { icon: '🔒', title: 'Private', text: 'Your songs never leave your device.' },
        { icon: '🎵', title: 'MP3 & WAV export', text: 'MP3 for sharing, WAV for the best quality.' },
      ]}
      useCases={[
        { title: 'Karaoke night', text: 'Make sing-along versions of songs that have no official karaoke release.' },
        { title: 'Vocal practice', text: 'Slow tricky passages down and shift the key until it sits comfortably.' },
        { title: 'Performances', text: 'Build a set of backing tracks in the right keys for your gig.' },
        { title: 'Content creation', text: 'Create instrumental beds for covers, reaction videos and tutorials.' },
      ]}
      faqs={[
        { q: 'How do I change the key without affecting tempo?', a: 'Our pitch shifter uses a phase-vocoder: it stretches the audio and resamples it so the pitch moves but the duration stays the same.' },
        { q: 'Will it remove backing vocals too?', a: 'The AI targets the lead vocal. Quiet backing vocals or harmonies may partly remain — they\u2019re often mixed like instruments.' },
        { q: 'Can I get synced lyrics?', a: 'Automatic lyrics display is coming with our AI transcription update. For now, download the track and sing along with any lyrics site.' },
        { q: 'Is it free?', a: 'Yes — unlimited karaoke tracks, no sign-up, no watermark.' },
        { q: 'What about copyright?', a: 'Only process songs you have the rights to use. A karaoke version doesn\u2019t grant performance or distribution rights.' },
      ]}
    />
  );
}
