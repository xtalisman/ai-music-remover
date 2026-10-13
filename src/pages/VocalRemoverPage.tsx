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
      h1="Remove Vocals from Any Song — Free AI Vocal Remover"
      sub="Upload any song and our free AI vocal remover separates the singing from the music in seconds. Get clean acapella vocals and instrumental tracks right in your browser — no uploads, no sign-up, no cost. Perfect for karaoke, remixes, sampling, and practice."
      badge="AI Vocal Remover"
      widget={<VocalRemoverWidget />}
      steps={[
        { title: 'Upload your song', text: 'Drag in an MP3, WAV, M4A or video file — or record directly from your microphone. Files up to 10 minutes work best for AI separation.' },
        { title: 'Choose your separation mode', text: 'Pick AI Separation for the cleanest vocal isolation (a one-time ~80MB model download), or Instant Mode for immediate results with no download using smart center-channel extraction.' },
        { title: 'AI isolates the vocals', text: 'A trained neural network analyzes your track\u2019s spectrogram and separates the vocal stem from every instrument — drums, bass, guitars, synths — entirely on your device.' },
        { title: 'Preview and download stems', text: 'Listen to the isolated vocals and the instrumental separately. Download either or both as high-quality 44.1kHz WAV files, ready for your DAW, video editor, or karaoke setup.' },
      ]}
      features={[
        { icon: '🤖', title: 'Real AI stem separation', text: 'A trained neural network — not a crude center-channel filter — identifies and isolates the human voice with remarkable precision, even in dense mixes.' },
        { icon: '💯', title: '100% free, forever', text: 'No credits, no watermarks, no trial limits, no sign-up required. Separate as many songs as you want, as often as you want.' },
        { icon: '🔒', title: 'Private by design', text: 'Every byte of processing happens in your browser. Your audio files are never uploaded to any server — they never leave your device.' },
        { icon: '⚡', title: 'Two modes for every need', text: 'AI mode delivers the best quality for finished productions. Instant mode gives you immediate results for quick tasks with zero download.' },
        { icon: '🎧', title: 'Studio-quality WAV output', text: 'Download 44.1kHz WAV stems that drop straight into Ableton, FL Studio, Logic, Premiere, or any professional audio or video software.' },
        { icon: '📱', title: 'Works on any device', text: 'Runs in Chrome, Edge, Safari, and Firefox on desktop, tablet, and mobile. No app to install, no plugins, no setup.' },
      ]}
      useCases={[
        { title: 'Create karaoke tracks', text: 'Strip the lead vocals from any song to make your own karaoke versions. Perfect for parties, practice sessions, or YouTube karaoke channels.', cta: 'Try Karaoke Maker', ctaHref: '/karaoke-maker' },
        { title: 'Sample vocals for remixes', text: 'Pull clean acapellas from your favorite tracks to chop, pitch, and flip into remixes, mashups, and beats. Every producer\u2019s secret weapon.', cta: 'Try AI Mashup Maker', ctaHref: '/ai-mashup-maker' },
        { title: 'Practice your instrument', text: 'Remove the vocals so you can sing along with just the band, or isolate the vocals to study the singer\u2019s phrasing and technique note by note.' },
        { title: 'Clean up recordings', text: 'Separate dialogue or sung vocals from background music in podcasts, interviews, live recordings, or video soundtracks for clearer, more professional edits.' },
      ]}
      faqs={[
        { q: 'How does the AI vocal remover work?', a: 'Our vocal remover uses a neural stem-separation model trained on thousands of songs. When you upload a track, the AI converts the audio into a spectrogram — a visual map of frequencies over time — and predicts which parts belong to the human voice versus drums, bass, guitars, and other instruments. It then reconstructs two separate audio streams: one containing just the vocals, and one with everything else. The entire process runs in your web browser using WebAssembly, so no audio is ever sent to a server. This is the same class of technology used in professional studio software, made free and accessible to everyone.' },
        { q: 'Is this vocal remover really 100% free?', a: 'Yes, completely free with no catches. There are no credits to buy, no watermarks on your downloads, no daily limits, and no account required. We can offer this because the AI models are open-source and all the heavy computation happens on your own device — we don\u2019t pay for server GPUs, so we don\u2019t need to charge you. The ~80MB AI model downloads once to your browser and is cached, so repeat visits are instant. If you find it useful, the best way to support us is to share it with a friend who makes music.' },
        { q: 'What quality can I expect from vocal removal?', a: 'In AI mode, you can expect remarkably clean vocal isolation on most professionally mixed songs — the kind of quality that used to require expensive studio software. The model is particularly good at separating lead vocals from pop, rock, hip-hop, and electronic mixes. That said, no stem separator is perfect: very dense mixes, heavy reverb, layered backing vocals, or whispered passages can leave faint artifacts or bleed-through. This is true of every vocal remover on the market, including paid ones costing $20+/month. For the absolute best results, use high-quality source files (320kbps MP3 or WAV) rather than low-bitrate streams.' },
        { q: 'Which audio and video formats are supported?', a: 'We support all common audio formats: MP3, WAV, M4A, OGG, FLAC, and WEBM. You can also upload video files — MP4, MOV, AVI, 3GP, and WEBM — and we\u2019ll automatically extract the audio track for separation. This makes it easy to remove vocals from music videos, live performance clips, or movie scenes. For best results, we recommend files up to 10 minutes long; longer files will show a warning because browser memory is limited. All processing happens at 44.1kHz, the standard for music production.' },
        { q: 'Do I need to install anything or create an account?', a: 'No installation and no account needed. The vocal remover runs entirely in modern web browsers — Chrome, Edge, Safari, and Firefox, on Windows, Mac, Linux, Android, and iOS. On your first visit, the AI model (~80MB) downloads automatically and is cached by your browser, so subsequent separations start instantly and even work offline. Your files are processed locally using WebAssembly and the Web Audio API. Nothing is uploaded, nothing is stored on our servers, and there are no cookies tracking your audio.' },
        { q: 'Can I use the separated vocals commercially?', a: 'The separated audio files are yours to download and keep — we place no restrictions on them. However, removing vocals from a song does not transfer or remove the original copyright. You should only process audio you have the rights to use, such as your own recordings, royalty-free music, or tracks where you\u2019ve obtained a license. Using isolated vocals from commercial songs in your own releases without permission could infringe copyright, just as sampling the original song would. When in doubt, consult a music licensing professional.' },
      ]}
    />
  );
}
