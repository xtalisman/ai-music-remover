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
      h1="Remove Background Noise from Any Audio — Free Noise Remover"
      sub="Clean up hiss, hum, room tone, fan noise, and wind from voice memos, podcasts, videos, and music recordings. Our free noise remover learns your audio\u2019s unique noise profile automatically, then removes it while keeping voices natural. Hear the before/after difference instantly, tune the intensity to taste, and download the cleaned audio — all in your browser, all free."
      badge="Noise Remover"
      widget={<NoiseRemoverWidget />}
      steps={[
        { title: 'Upload your noisy audio', text: 'Voice memo, podcast episode, video soundtrack, old tape transfer — anything with unwanted background hiss, hum, or room noise. MP3, WAV, M4A, or video files all work.' },
        { title: 'Noise profile detected automatically', text: 'The tool analyzes the start of your file to learn what the background noise "sounds like" — its frequency fingerprint. Tip: leave a half-second of pure background noise at the beginning for the cleanest results.' },
        { title: 'Set your intensity', text: 'Control how aggressively the noise is removed with a simple slider. Gentle for natural ambience, stronger for distracting hiss — you\u2019re always in charge.' },
        { title: 'Compare and download', text: 'Toggle between before and after with one tap to hear exactly what changed. When it sounds right, export as WAV for quality or MP3 for sharing.' },
      ]}
      features={[
        { icon: '🔇', title: 'Hiss, hum & room tone removal', text: 'Spectral gating targets steady background noise — air conditioner hum, mic preamp hiss, room tone, wind rumble — while preserving the voices and music you want to keep.' },
        { icon: '🎚️', title: 'Precision intensity control', text: 'A single intuitive slider dials the perfect balance between "clean" and "natural." No confusing thresholds, attack times, or reduction curves to learn.' },
        { icon: '🔀', title: 'Instant before/after toggle', text: 'A/B compare the original and cleaned versions with one tap. You\u2019ll always know exactly what the processing changed — no surprises in your download.' },
        { icon: '💯', title: 'Free and unlimited', text: 'Clean as many files as you want. No accounts, no watermarks, no "5 free minutes per month" — professional noise reduction without the subscription.' },
        { icon: '🔒', title: 'Private on-device processing', text: 'Sensitive recordings — interviews, legal dictation, personal memos — never leave your device. Everything is processed locally in your browser.' },
        { icon: '🎙️', title: 'Made for voices and music', text: 'Optimized for speech (podcasts, videos, calls, lectures) but equally at home cleaning up music demos, field recordings, and digitized tapes.' },
      ]}
      useCases={[
        { title: 'Podcast episodes that sound pro', text: 'Remove the room tone, mic hiss, and computer fan hum that screams "recorded in a bedroom." Your listeners will think you upgraded to a treated studio — the difference is that dramatic.' },
        { title: 'Video audio rescue', text: 'Camera audio plagued by wind, handling noise, or air conditioning? Clean it up before your edit and save footage that would otherwise be unusable.' },
        { title: 'Voice memos worth keeping', text: 'That brilliant idea you recorded on your phone in a noisy café, the lecture captured from the back row — make them clear and listenable instead of deleting them.' },
        { title: 'Restore old recordings', text: 'Digitized cassette tapes, vinyl rips, and old family recordings carry decades of hiss and hum. Reduce the noise while keeping the warmth and character of the original.' },
      ]}
      faqs={[
        { q: 'How does the noise remover learn what to remove?', a: 'Our noise remover uses spectral noise profiling. When you upload a file, it analyzes the first half-second to build a "fingerprint" of the background noise — which frequencies are present, and how loud they are. It then scans the entire file and attenuates those specific frequencies wherever they appear, while leaving other frequencies (like the human voice) largely untouched. This is the same fundamental approach used in professional tools like iZotope RX and Adobe Audition\u2019s noise reduction, simplified into a one-slider interface. For the best results, make sure your recording starts with a brief moment of pure background noise — no talking, no music — so the profiler gets a clean sample of what to remove.' },
        { q: 'Will noise removal make voices sound robotic or "underwater"?', a: 'At moderate intensity settings, voices stay completely natural — you\u2019ll just notice the background got quieter. The "underwater" or "metallic" artifacts people associate with noise reduction happen when the processing is pushed too aggressively: the algorithm starts removing frequencies that are part of the voice itself, not just the noise. That\u2019s exactly why we built the before/after toggle and the intensity slider. Start around the middle, listen to the result, and increase gradually until the noise is gone but the voice still sounds like the person. Every recording is different, so trust your ears — if it starts sounding processed, back off a notch. The sweet spot is usually easy to find.' },
        { q: 'What kinds of noise can it remove — and what can\u2019t it?', a: 'It excels at steady, consistent background noise: electrical hum (50/60Hz and harmonics), preamp hiss, room tone, air conditioner drone, computer fan noise, wind rumble, and tape hiss. These are the noises with a stable frequency fingerprint that the profiler can learn and target. It struggles with sudden, irregular sounds — a door slamming, a dog barking, someone coughing, keyboard clicks — because those don\u2019t have a consistent profile to learn. It also can\u2019t separate two voices talking at once, or remove music playing behind speech (for that, try our AI stem separation tools). Think of it as a specialist for "the room sounds bad," not "something loud happened."' },
        { q: 'Is the noise remover really free with no limits?', a: 'Yes — unlimited files, unlimited length (within the 10-minute recommended guideline), no account, no watermark. Professional noise reduction plugins cost $100-400, and online "AI" cleaners typically give you a few free minutes before demanding a subscription. We can offer it free because the spectral processing runs entirely on your device using the Web Audio API — we have no server costs per file. Your audio is processed locally, which is also why it\u2019s private: sensitive recordings never touch the internet.' },
        { q: 'Can I clean the audio from a video file?', a: 'Absolutely. Upload MP4, MOV, AVI, 3GP, or WEBM video files and we\u2019ll automatically extract the audio track for noise reduction. You\u2019ll get back a cleaned audio file (WAV or MP3) that you can sync back to your video in any editor. This is perfect for vloggers, course creators, and anyone whose camera audio picked up wind, room echo, or handling noise. (Full video re-export with the cleaned audio muxed back in is on our roadmap — for now, the two-step process of cleaning audio separately gives you the most control anyway.)' },
        { q: 'How is this different from the noise suppression in Zoom or Discord?', a: 'Call apps use real-time noise suppression optimized for live conversation — it has to work with ~20ms of latency, so it\u2019s aggressive and can clip the start of words. Our tool processes your file offline, which means it can analyze the entire recording first, build an accurate noise profile, and apply careful spectral gating without the time pressure. The result is noticeably cleaner and more natural, especially for content you\u2019ll publish. Think of Zoom\u2019s filter as a quick tidy-up and ours as a proper deep clean.' },
      ]}
    />
  );
}
