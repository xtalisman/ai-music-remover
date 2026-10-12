import { useEffect, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { useSeparation } from '../hooks/useSeparation';
import { encodeWav, formatTime } from '../lib/audio';
import { saveJob } from '../lib/history';

function VocalRemoverWidget() {
  const s = useSeparation();
  const [mode, setMode] = useState<'ai' | 'fast'>('ai');
  const [urls, setUrls] = useState<{ vocals: string; instrumental: string }>({ vocals: '', instrumental: '' });

  const start = () => {
    s.separate(mode);
  };

  // Build result URLs when stems arrive
  useEffect(() => {
    if (s.phase === 'done' && s.stems && !urls.vocals) {
      const sr = s.stems.sampleRate;
      const vocals = URL.createObjectURL(encodeWav(...s.stems.vocals, sr));
      const instrumental = URL.createObjectURL(encodeWav(...s.stems.instrumental, sr));
      setUrls({ vocals, instrumental });
      saveJob({
        id: `job-${Date.now()}`, tool: 'Vocal Remover', fileName: s.fileName,
        createdAt: Date.now(), durationSec: s.durationSec,
        stems: { vocals: encodeWav(...s.stems.vocals, sr), instrumental: encodeWav(...s.stems.instrumental, sr) },
      }).catch(() => {});
    }
    if (s.phase === 'idle') setUrls({ vocals: '', instrumental: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.stems]);

  const dl = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {s.phase === 'idle' && <UploadWidget onFile={s.loadFile} />}
      {s.phase === 'loading' && <p className="text-center py-12 text-muted">Reading {s.fileName}…</p>}
      {s.phase === 'ready' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <h3 className="font-bold truncate">{s.fileName}</h3>
          <p className="text-sm text-muted mb-5">Duration: {formatTime(s.durationSec)}</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <button onClick={() => setMode('ai')} className={`rounded-2xl border-2 p-4 text-left ${mode === 'ai' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="font-bold">🤖 AI Separation</div>
              <div className="text-xs text-muted mt-1">Best quality, ~80MB model download once.</div>
            </button>
            <button onClick={() => setMode('fast')} className={`rounded-2xl border-2 p-4 text-left ${mode === 'fast' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="font-bold">⚡ Instant Mode</div>
              <div className="text-xs text-muted mt-1">Immediate, no download.</div>
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={start} className="flex-1 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">Remove vocals</button>
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
      {s.phase === 'done' && urls.vocals && (
        <div>
          <ResultPlayer tracks={[
            { id: 'vocals', label: 'Vocals', url: urls.vocals },
            { id: 'inst', label: 'Instrumental', url: urls.instrumental },
          ]} />
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => dl(urls.vocals, 'vocals.wav')} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ Vocals (WAV)</button>
            <button onClick={() => dl(urls.instrumental, 'instrumental.wav')} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ Instrumental (WAV)</button>
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

export default function VocalRemoverPage() {
  return (
    <ToolPage
      path="/vocal-remover"
      seoTitle="Vocal Remover — Remove Vocals from Any Song, Free | AI Music Remover"
      seoDescription="Remove vocals from any song with free AI stem separation in your browser. Download the vocals and instrumental separately. No sign-up, files never leave your device."
      h1="Remove vocals from any song"
      sub="Upload a track and get clean vocals and instrumental versions — separated by AI, right in your browser, free."
      badge="AI Vocal Remover"
      widget={<VocalRemoverWidget />}
      steps={[
        { title: 'Upload your song', text: 'Drop in an MP3, WAV or M4A — or record straight from your microphone.' },
        { title: 'AI separates the vocals', text: 'A neural network isolates the vocal stem from the instrumental in your browser.' },
        { title: 'Preview and download', text: 'Listen to each stem, then download the vocals, the instrumental, or both as WAV.' },
      ]}
      features={[
        { icon: '🤖', title: 'Real AI separation', text: 'A trained neural stem-separation model — not a simple filter — isolates the voice.' },
        { icon: '💯', title: '100% free', text: 'No credits, no watermarks, no sign-up. Separate as many songs as you like.' },
        { icon: '🔒', title: 'Private by design', text: 'Everything runs on your device. Your audio is never uploaded anywhere.' },
        { icon: '⚡', title: 'Instant mode', text: 'Need it now? Instant mode separates centered vocals immediately, no download.' },
        { icon: '🎧', title: 'Studio-quality output', text: 'Download 44.1kHz WAV stems ready for your DAW or video editor.' },
        { icon: '📱', title: 'Works everywhere', text: 'Runs in Chrome, Edge, Safari and Firefox — desktop and mobile.' },
      ]}
      useCases={[
        { title: 'Make karaoke tracks', text: 'Strip the vocals from your favorite songs for karaoke night or practice sessions.', cta: 'Try Karaoke Maker', ctaHref: '/karaoke-maker' },
        { title: 'Sample and remix', text: 'Pull clean acapellas for remixes, mashups and sample flips.', cta: 'Try AI Mashup Maker', ctaHref: '/ai-mashup-maker' },
        { title: 'Practice your instrument', text: 'Remove the vocals to play or sing along with just the band.' },
        { title: 'Clean up recordings', text: 'Isolate dialogue or vocals from mixed recordings for clearer edits.' },
      ]}
      faqs={[
        { q: 'How does the vocal remover work?', a: 'An AI stem-separation model analyzes the song\u2019s spectrogram and estimates which parts belong to the voice versus everything else. It runs entirely in your browser — no audio is sent to any server.' },
        { q: 'Is it really free?', a: 'Yes. There are no credits, watermarks or accounts. The AI models are open-source and run on your own device, which is why we can offer it free.' },
        { q: 'What quality can I expect?', a: 'AI mode gives the cleanest separation, especially on professionally mixed songs. Very dense mixes or heavy effects can leave faint artifacts — that\u2019s normal for all stem separators.' },
        { q: 'Which formats are supported?', a: 'MP3, WAV, M4A, OGG, FLAC and WEBM audio, plus audio extracted from MP4, MOV, AVI and other video files.' },
        { q: 'Do I need to install anything?', a: 'No. It runs in Chrome, Edge, Safari or Firefox. The AI model (~80MB) downloads once on first use and is cached for offline use afterwards.' },
        { q: 'Who owns the separated tracks?', a: 'You do — but only process audio you have the rights to. Removing vocals doesn\u2019t transfer any copyright.' },
      ]}
    />
  );
}
