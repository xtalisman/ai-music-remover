import { useRef, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { runAudioJob } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100, encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { saveJob } from '../lib/history';
import { useRequireAuth } from '../lib/auth';

type Phase = 'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error';

function NoiseRemoverWidget() {
  const requireAuth = useRequireAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [durationSec, setDurationSec] = useState(0);
  const [intensity, setIntensity] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [cleanUrl, setCleanUrl] = useState('');
  const [cleanAudio, setCleanAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const [origAudio, setOrigAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const jobRef = useRef<{ cancel: () => void } | null>(null);

  const handleFile = async (file: File) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      const { left, right, sampleRate, duration } = await decodeAudioFile(file);
      setDurationSec(duration);
      const [rL, rR] = await resampleTo44100(left, right, sampleRate);
      setOrigAudio([rL, rR]);
      setOriginalUrl(URL.createObjectURL(encodeWav(rL, rR, 44100)));
      setPhase('ready');
    } catch {
      setError('Could not read that file.');
      setPhase('error');
    }
  };

  const clean = () => {
    if (!origAudio) return;
    setPhase('processing');
    setProgress(0);
    const job = runAudioJob(
      'denoise',
      { left: origAudio[0].slice(), right: origAudio[1].slice(), intensity },
      (f, label) => { setProgress(f); setProgressLabel(label); },
    );
    job.promise.then(
      (res) => {
        if (res.kind !== 'audio') { setError('Noise removal failed.'); setPhase('error'); return; }
        const l = new Float32Array(res.left), r = new Float32Array(res.right);
        setCleanAudio([l, r]);
        const url = URL.createObjectURL(encodeWav(l, r, 44100));
        setCleanUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setPhase('done');
        saveJob({
          id: `job-${Date.now()}`, tool: 'Noise Remover', fileName,
          createdAt: Date.now(), durationSec,
          stems: { cleaned: encodeWav(l, r, 44100) },
        }).catch(() => {});
      },
      (e) => {
        if ((e as DOMException).name === 'AbortError') { setPhase('ready'); return; }
        setError(`Failed: ${(e as Error).message}`);
        setPhase('error');
      },
    );
    jobRef.current = job;
  };

  const cancel = () => jobRef.current?.cancel();

  const download = async (fmt: 'wav' | 'mp3') => {
    if (!cleanAudio) return;
    const blob = fmt === 'wav' ? encodeWav(cleanAudio[0], cleanAudio[1], 44100)
      : await encodeMp3(cleanAudio[0], cleanAudio[1], 44100);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName.replace(/\.[^.]+$/, '')}-cleaned.${fmt}`;
    a.click();
  };

  const reset = () => {
    setPhase('idle'); setOriginalUrl(''); setCleanUrl('');
    setCleanAudio(null); setOrigAudio(null); setError('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {phase === 'idle' && <UploadWidget onFile={handleFile} />}
      {phase === 'loading' && <p className="text-center py-12 text-muted">Reading {fileName}…</p>}
      {phase === 'ready' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <h3 className="font-bold truncate mb-1">{fileName}</h3>
          <p className="text-sm text-muted mb-6">Duration: {formatTime(durationSec)}</p>
          <label className="block mb-6">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Noise reduction intensity</span>
              <span className="text-muted">{Math.round(intensity * 100)}%</span>
            </div>
            <input type="range" min={10} max={100} value={Math.round(intensity * 100)}
              onChange={(e) => setIntensity(Number(e.target.value) / 100)}
              className="w-full accent-[var(--color-primary)]" />
            <p className="text-xs text-muted mt-2">
              Higher values remove more noise but can soften the wanted audio. The noise profile is
              learned automatically from the start of your file.
            </p>
          </label>
          <div className="flex gap-3">
            <button onClick={() => requireAuth(clean)} className="flex-1 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Remove noise
            </button>
            <button onClick={reset} className="px-6 py-3 rounded-full border border-border">New file</button>
          </div>
        </div>
      )}
      {phase === 'processing' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mb-6">{progressLabel} ({Math.round(progress * 100)}%)</p>
          <button onClick={cancel} className="px-6 py-2 rounded-full border border-border text-sm">Cancel</button>
        </div>
      )}
      {phase === 'done' && originalUrl && cleanUrl && (
        <div>
          <ResultPlayer tracks={[
            { id: 'original', label: 'Before (original)', url: originalUrl },
            { id: 'clean', label: 'After (cleaned)', url: cleanUrl },
          ]} />
          <p className="text-xs text-muted mt-2 text-center">Toggle between Before and After to hear the difference.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => download('wav')} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">⬇ Cleaned (WAV)</button>
            <button onClick={() => download('mp3')} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ Cleaned (MP3)</button>
            <button onClick={() => setPhase('ready')} className="px-4 py-2 rounded-full border border-border text-sm">Adjust intensity</button>
            <button onClick={reset} className="px-4 py-2 rounded-full border border-border text-sm">New file</button>
          </div>
        </div>
      )}
      {phase === 'error' && (
        <div className="text-center py-12">
          <p className="text-danger mb-6">{error}</p>
          <button onClick={reset} className="px-8 py-3 rounded-full bg-primary text-white font-semibold">Try again</button>
        </div>
      )}
    </div>
  );
}

export default function NoiseRemoverPage() {
  return (
    <ToolPage
      path="/noise-remover"
      seoTitle="Noise Remover — Remove Hiss, Hum & Background Noise Free | AI Music Remover"
      seoDescription="Remove hiss, hum, room noise and wind from any audio or video. Free spectral noise reduction in your browser — before/after preview included."
      h1="Remove background noise from any audio"
      sub="Clean up hiss, hum, room tone and wind. Hear the before/after difference instantly — free in your browser."
      badge="Noise Remover"
      widget={<NoiseRemoverWidget />}
      steps={[
        { title: 'Upload your audio', text: 'Voice memo, podcast, video audio — anything with unwanted background noise.' },
        { title: 'Set the intensity', text: 'The tool learns your noise profile automatically; you control how aggressively it\u2019s removed.' },
        { title: 'Compare & download', text: 'Toggle before/after to hear the difference, then export WAV or MP3.' },
      ]}
      features={[
        { icon: '🔇', title: 'Hiss & hum removal', text: 'Spectral gating targets steady background noise while preserving voices.' },
        { icon: '🎚️', title: 'Intensity control', text: 'Dial in the perfect balance between clean and natural.' },
        { icon: '🔀', title: 'Before/after toggle', text: 'A/B compare with one tap so you always know what changed.' },
        { icon: '💯', title: 'Free & unlimited', text: 'No accounts, no watermarks, no limits.' },
        { icon: '🔒', title: 'Private', text: 'Processed on your device — sensitive recordings stay yours.' },
        { icon: '🎙️', title: 'Voice & music', text: 'Works on speech, podcasts, field recordings and music.' },
      ]}
      useCases={[
        { title: 'Podcast cleanup', text: 'Remove room tone and mic hiss from episodes.' },
        { title: 'Video audio', text: 'Clean up wind and handling noise from camera audio.' },
        { title: 'Voice memos', text: 'Make phone recordings clear and listenable.' },
        { title: 'Old recordings', text: 'Reduce tape hiss and hum from digitized archives.' },
      ]}
      faqs={[
        { q: 'How does it learn the noise?', a: 'It analyzes the start of your file to build a noise profile, then attenuates matching frequencies throughout. For best results, leave a half-second of pure background noise at the start.' },
        { q: 'Will it affect voices or music?', a: 'At moderate intensity, voices stay natural. Very high intensity can make audio sound "underwater" — use the before/after toggle to find the sweet spot.' },
        { q: 'What kinds of noise does it remove?', a: 'Steady noises: hiss, hum, room tone, fan noise, wind rumble. Sudden sounds (door slams, coughs) are harder for any noise remover.' },
        { q: 'Is it free?', a: 'Yes — unlimited use, no sign-up.' },
        { q: 'Does it work on video files?', a: 'Yes — upload MP4, MOV or WEBM and we\u2019ll process the audio track. (Video re-export with cleaned audio is coming soon.)' },
      ]}
    />
  );
}
