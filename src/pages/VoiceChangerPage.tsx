import { useEffect, useMemo, useRef, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import { runAudioJob, type VoiceFxPreset } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100, encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { useRequireAuth } from '../lib/auth';

const PRESETS: { id: VoiceFxPreset; label: string; desc: string; icon: string }[] = [
  { id: 'deep', label: 'Deep Voice', desc: 'Lower pitch for a commanding tone', icon: '🎙️' },
  { id: 'high', label: 'High Voice', desc: 'Raise pitch for a lighter tone', icon: '🎈' },
  { id: 'chipmunk', label: 'Chipmunk', desc: 'Classic squeaky cartoon voice', icon: '🐿️' },
  { id: 'robot', label: 'Robot', desc: 'Metallic sci-fi modulation', icon: '🤖' },
  { id: 'echo', label: 'Echo', desc: 'Spacious repeating delay', icon: '🔊' },
  { id: 'cave', label: 'Cave', desc: 'Roomy, cavernous ambience', icon: '🦇' },
];

type Phase = 'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error';

function VoiceChangerWidget() {
  const requireAuth = useRequireAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [durationSec, setDurationSec] = useState(0);
  const [preset, setPreset] = useState<VoiceFxPreset>('deep');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [resultAudio, setResultAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const audioRef = useRef<{ left: Float32Array; right: Float32Array } | null>(null);

  const handleFile = async (file: File, kind: string) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      // voice recordings: keep native rate for FX, resample only if needed
      const { left, right, sampleRate: sr, duration } = await decodeAudioFile(file);
      setDurationSec(duration);
      const [rL, rR] = await resampleTo44100(left, right, sr);
      audioRef.current = { left: rL, right: rR };
      setSampleRate(44100);
      setPhase('ready');
    } catch {
      setError('Could not read that file.');
      setPhase('error');
    }
  };

  const applyFx = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPhase('processing');
    setProgress(0);
    const job = runAudioJob(
      'voiceFx',
      { left: audio.left.slice(), right: audio.right.slice(), sampleRate, preset },
      (f) => setProgress(f),
    );
    job.promise.then(
      (res) => {
        if (res.kind !== 'audio') { setError('Effect failed.'); setPhase('error'); return; }
        const l = new Float32Array(res.left), r = new Float32Array(res.right);
        setResultAudio([l, r]);
        const url = URL.createObjectURL(encodeWav(l, r, sampleRate));
        setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setPhase('done');
      },
      (e) => { setError(`Effect failed: ${(e as Error).message}`); setPhase('error'); },
    );
  };

  const download = async (fmt: 'wav' | 'mp3') => {
    if (!resultAudio) return;
    const blob = fmt === 'wav' ? encodeWav(resultAudio[0], resultAudio[1], sampleRate)
      : await encodeMp3(resultAudio[0], resultAudio[1], sampleRate);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `voice-${preset}.${fmt}`;
    a.click();
  };

  const reset = () => {
    setPhase('idle'); setAudioUrl(''); setResultAudio(null); setError('');
    audioRef.current = null;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {phase === 'idle' && <UploadWidget onFile={handleFile} accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" />}
      {phase === 'loading' && <p className="text-center py-12 text-muted">Reading {fileName}…</p>}
      {phase === 'ready' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <h3 className="font-bold truncate mb-1">{fileName}</h3>
          <p className="text-sm text-muted mb-6">Duration: {formatTime(durationSec)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`rounded-2xl border-2 p-4 text-left ${preset === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <div className="text-2xl mb-1">{p.icon}</div>
                <div className="font-bold text-sm">{p.label}</div>
                <div className="text-xs text-muted mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => requireAuth(applyFx)} className="flex-1 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Apply {PRESETS.find((p) => p.id === preset)?.label}
            </button>
            <button onClick={reset} className="px-6 py-3 rounded-full border border-border">New</button>
          </div>
        </div>
      )}
      {phase === 'processing' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted">Applying effect… ({Math.round(progress * 100)}%)</p>
        </div>
      )}
      {phase === 'done' && audioUrl && (
        <div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mb-4">
            <h3 className="font-bold mb-4">{PRESETS.find((p) => p.id === preset)?.label} — preview</h3>
            <audio src={audioUrl} controls className="w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => download('mp3')} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">⬇ MP3</button>
            <button onClick={() => download('wav')} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ WAV</button>
            <button onClick={() => setPhase('ready')} className="px-4 py-2 rounded-full border border-border text-sm">Try another effect</button>
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
      <p className="text-xs text-muted mt-6 text-center max-w-xl mx-auto">
        ⚠️ Please don’t use voice effects to impersonate real people without their consent —
        including for pranks, fraud or misinformation. These effects are for fun, creative and accessibility uses.
      </p>
    </div>
  );
}

/* ============================================================
   Voice Library — your device's built-in system voices via the
   free Web Speech API (no network, no API keys, no cost).
   On Windows/macOS/Android these include high-quality neural
   voices — the closest $0 equivalent to studio voice APIs.
   We never call paid TTS services (e.g. ElevenLabs).
   ============================================================ */

function langLabel(tag: string): string {
  try {
    const base = tag.split('-')[0];
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(base);
    return name ? `${name} (${tag})` : tag;
  } catch {
    return tag;
  }
}

function VoiceLibrary() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [text, setText] = useState('Hello! This is a preview of this voice.');
  const [speakingUri, setSpeakingUri] = useState<string | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    // Chrome loads voices asynchronously — refresh when ready.
    synth.onvoiceschanged = load;
    return () => {
      synth.onvoiceschanged = null;
      synth.cancel();
    };
  }, []);

  const preview = (v: SpeechSynthesisVoice) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.trim() || 'Hello!');
    u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setSpeakingUri(null);
    u.onerror = () => setSpeakingUri(null);
    setSpeakingUri(v.voiceURI);
    synth.speak(u);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeakingUri(null);
  };

  const groups = useMemo(() => {
    const m = new Map<string, SpeechSynthesisVoice[]>();
    [...voices]
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
      .forEach((v) => {
        const g = m.get(v.lang);
        if (g) g.push(v);
        else m.set(v.lang, [v]);
      });
    return [...m.entries()];
  }, [voices]);

  if (!supported) {
    return (
      <div className="max-w-3xl mx-auto mt-10 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center text-sm text-muted">
        Your browser doesn't support the Web Speech API, so the voice library isn't available here.
      </div>
    );
  }

  return (
    <section className="max-w-3xl mx-auto mt-10" aria-label="Voice library">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
        <h2 className="text-xl font-extrabold">Voice Library</h2>
        <p className="text-sm text-muted mt-2 mb-5">
          Preview your device's built-in voices — on Windows, macOS and Android these include
          high-quality neural voices. 100% free, works offline where voices are installed.
        </p>

        <label className="block text-sm font-medium mb-1" htmlFor="voice-lib-text">Preview text</label>
        <div className="flex gap-2 mb-6">
          <input
            id="voice-lib-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something to preview…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {speakingUri && (
            <button onClick={stop} className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:border-danger hover:text-danger shrink-0">
              ⏹ Stop
            </button>
          )}
        </div>

        {voices.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Loading system voices…</p>
        ) : (
          <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
            {groups.map(([lang, vs]) => (
              <div key={lang}>
                <h3 className="text-sm font-bold text-muted uppercase tracking-wide mb-2">
                  {langLabel(lang)} · {vs.length}
                </h3>
                <ul className="space-y-1.5">
                  {vs.map((v) => {
                    const active = speakingUri === v.voiceURI;
                    return (
                      <li
                        key={v.voiceURI}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                          active ? 'border-primary bg-primary/5' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{v.name}</div>
                          <div className="text-xs text-muted">{v.lang}{v.localService ? ' · on-device' : ' · network'}</div>
                        </div>
                        <button
                          onClick={() => (active ? stop() : preview(v))}
                          className={`px-4 py-1.5 rounded-full text-sm font-semibold shrink-0 transition ${
                            active
                              ? 'bg-danger/10 text-danger'
                              : 'bg-primary text-white hover:bg-primary-deep'
                          }`}
                        >
                          {active ? '⏹ Stop' : '▶ Preview'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function VoiceChangerPage() {
  return (
    <ToolPage
      path="/voice-changer"
      seoTitle="Voice Changer — Fun Voice Effects Free in Your Browser | AI Music Remover"
      seoDescription="Change your voice with free browser effects: deep, high, chipmunk, robot, echo and more. Record or upload, preview and download MP3."
      h1="Change your voice in seconds"
      sub="Record or upload your voice, pick an effect, and download the result. Free, private, in your browser."
      badge="Voice Effects"
      widget={<><VoiceChangerWidget /><VoiceLibrary /></>}
      steps={[
        { title: 'Record or upload', text: 'Use your microphone or drop in an audio clip.' },
        { title: 'Pick an effect', text: 'Deep, high, chipmunk, robot, echo or cave — hear it instantly.' },
        { title: 'Download', text: 'Export your new voice as MP3 or WAV.' },
      ]}
      features={[
        { icon: '🎭', title: '6 fun presets', text: 'From subtle pitch shifts to full robot mode.' },
        { icon: '🎤', title: 'Mic recording', text: 'Record directly in the browser — no uploads.' },
        { icon: '💯', title: 'Free unlimited', text: 'Sign in once — free forever, no watermarks, no limits.' },
        { icon: '🔒', title: 'Private', text: 'Your voice never leaves your device.' },
        { icon: '⚡', title: 'Fast DSP', text: 'Real digital signal processing — no fake filters.' },
        { icon: '🎵', title: 'MP3 & WAV', text: 'Download in the format you need.' },
      ]}
      useCases={[
        { title: 'Content & streaming', text: 'Character voices for videos, streams and podcasts.' },
        { title: 'Pranks & fun', text: 'Surprise friends (with their knowledge!) with a new voice.' },
        { title: 'Anonymity', text: 'Disguise your voice in sensitive recordings.' },
        { title: 'Creative projects', text: 'Voice-overs for animations, games and demos.' },
      ]}
      faqs={[
        { q: 'How do the voice effects work?', a: 'Real DSP: pitch shifting via a phase vocoder, ring modulation for robot, and delay networks for echo and cave. Everything runs locally.' },
        { q: 'Can I use it live on calls?', a: 'This tool processes recordings and uploads. Live call integration isn\u2019t supported.' },
        { q: 'Is it free?', a: 'Yes — unlimited effects. A free sign-in is required to process files.' },
        { q: 'Can I impersonate someone?', a: 'Please don\u2019t. These effects are for fun and creativity — never use them to deceive, defraud or mislead anyone.' },
      ]}
    />
  );
}
