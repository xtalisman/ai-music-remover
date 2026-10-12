import { useRef, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import { transcribeAudio, to16kMono, translateTexts, type TranscriptChunk } from '../lib/transcribeClient';
import { decodeAudioFile, formatTime } from '../lib/audio';
import { useRequireAuth } from '../lib/auth';

type Phase = 'idle' | 'loading' | 'transcribing' | 'translating' | 'done' | 'error';

interface LangPair { from: string; to: string; label: string; model: string; ttsLang: string; }

const PAIRS: LangPair[] = [
  { from: 'en', to: 'es', label: 'English → Spanish', model: 'Xenova/opus-mt-en-es', ttsLang: 'es-ES' },
  { from: 'en', to: 'fr', label: 'English → French', model: 'Xenova/opus-mt-en-fr', ttsLang: 'fr-FR' },
  { from: 'en', to: 'de', label: 'English → German', model: 'Xenova/opus-mt-en-de', ttsLang: 'de-DE' },
  { from: 'en', to: 'it', label: 'English → Italian', model: 'Xenova/opus-mt-en-it', ttsLang: 'it-IT' },
  { from: 'en', to: 'zh', label: 'English → Chinese', model: 'Xenova/opus-mt-en-zh', ttsLang: 'zh-CN' },
  { from: 'es', to: 'en', label: 'Spanish → English', model: 'Xenova/opus-mt-es-en', ttsLang: 'en-US' },
  { from: 'fr', to: 'en', label: 'French → English', model: 'Xenova/opus-mt-fr-en', ttsLang: 'en-US' },
  { from: 'de', to: 'en', label: 'German → English', model: 'Xenova/opus-mt-de-en', ttsLang: 'en-US' },
  { from: 'it', to: 'en', label: 'Italian → English', model: 'Xenova/opus-mt-it-en', ttsLang: 'en-US' },
  { from: 'zh', to: 'en', label: 'Chinese → English', model: 'Xenova/opus-mt-zh-en', ttsLang: 'en-US' },
];

function fmtSrt(t: number): string {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function TranslatorWidget() {
  const requireAuth = useRequireAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [pairIdx, setPairIdx] = useState(0);
  const [origChunks, setOrigChunks] = useState<TranscriptChunk[]>([]);
  const [transChunks, setTransChunks] = useState<TranscriptChunk[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const jobRef = useRef<{ cancel: () => void } | null>(null);

  const handleFile = async (file: File) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      const { left, right, sampleRate } = await decodeAudioFile(file);
      setPhase('transcribing');
      const mono16k = await to16kMono(left, right, sampleRate);
      const tJob = transcribeAudio(mono16k, (f, label) => { setProgress(f * 0.5); setProgressLabel(label); });
      jobRef.current = tJob;
      const tRes = await tJob.promise;
      const chunks: TranscriptChunk[] = (tRes.chunks || []).map((c) => ({ ...c }));
      setOrigChunks(chunks);

      setPhase('translating');
      const pair = PAIRS[pairIdx];
      const texts = chunks.length ? chunks.map((c) => c.text) : [tRes.text || ''];
      const trJob = translateTexts(texts, pair.model, (f, label) => { setProgress(0.5 + f * 0.5); setProgressLabel(label); });
      jobRef.current = trJob;
      const trRes = await trJob.promise;
      const translated = trRes.texts || [];
      setTransChunks(chunks.length
        ? chunks.map((c, i) => ({ ...c, text: translated[i] || '' }))
        : [{ timestamp: [0, 0], text: translated[0] || '' }]);
      setPhase('done');
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') { setPhase('idle'); return; }
      setError(`Failed: ${(e as Error).message}`);
      setPhase('error');
    }
  };

  const speakTranslated = () => {
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const pair = PAIRS[pairIdx];
    const text = transChunks.map((c) => c.text).join(' ');
    if (!text.trim()) return;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(pair.to));
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = pair.ttsLang;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(u);
  };

  const download = (content: string, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = name;
    a.click();
  };

  const exportSrt = (chunks: TranscriptChunk[], suffix: string) => {
    const srt = chunks.map((c, i) => `${i + 1}\n${fmtSrt(c.timestamp[0])} --> ${fmtSrt(c.timestamp[1])}\n${c.text}\n`).join('\n');
    download(srt, `${fileName.replace(/\.[^.]+$/, '')}-${suffix}.srt`);
  };

  const reset = () => {
    speechSynthesis.cancel();
    setPhase('idle'); setOrigChunks([]); setTransChunks([]); setError(''); setSpeaking(false);
  };

  const pair = PAIRS[pairIdx];

  return (
    <div className="max-w-3xl mx-auto">
      {phase === 'idle' && (
        <div>
          <label className="block max-w-md mx-auto mb-6 text-sm">
            <span className="font-medium">Translation direction</span>
            <select value={pairIdx} onChange={(e) => setPairIdx(Number(e.target.value))}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background">
              {PAIRS.map((p, i) => <option key={p.model} value={i}>{p.label}</option>)}
            </select>
          </label>
          <UploadWidget onFile={(f) => requireAuth(() => handleFile(f))} accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.ogg,.webm" />
          <p className="text-xs text-muted text-center mt-3">
            Supported: {PAIRS.map((p) => p.label).join(' · ')}. More pairs coming soon.
          </p>
        </div>
      )}
      {(phase === 'loading' || phase === 'transcribing' || phase === 'translating') && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mb-6">{progressLabel} ({Math.round(progress * 100)}%)</p>
          <button onClick={() => jobRef.current?.cancel()} className="px-6 py-2 rounded-full border border-border text-sm">Cancel</button>
        </div>
      )}
      {phase === 'done' && (
        <div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
              <h3 className="font-bold mb-3 text-sm">Original transcript</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
                {origChunks.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-muted font-mono whitespace-nowrap">{formatTime(c.timestamp[0])}</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius-card)] border border-primary/40 bg-primary/5 p-5">
              <h3 className="font-bold mb-3 text-sm">Translated — {pair.label}</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
                {transChunks.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-muted font-mono whitespace-nowrap">{formatTime(c.timestamp[0])}</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={speakTranslated} className="px-4 py-2 rounded-full bg-secondary text-white text-sm font-semibold">
              {speaking ? '⏹ Stop speech' : '🔊 Hear translation'}
            </button>
            <button onClick={() => exportSrt(transChunks, pair.to)} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">
              ⬇ Translated SRT
            </button>
            <button onClick={() => download(transChunks.map((c) => c.text).join('\n'), `${fileName.replace(/\.[^.]+$/, '')}-${pair.to}.txt`)}
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">
              ⬇ Translated TXT
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-full border border-border text-sm">New file</button>
          </div>
          <p className="text-xs text-muted mt-3">
            Spoken translation uses your device’s {pair.to.toUpperCase()} voices when available.
          </p>
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

export default function AudioTranslatorPage() {
  return (
    <ToolPage
      path="/ai-audio-translator"
      seoTitle="Audio Translator — Transcribe & Translate Audio Free | AI Music Remover"
      seoDescription="Transcribe audio with Whisper AI and translate it in your browser. 10 language pairs, translated subtitles, spoken translation. Free."
      h1="Translate your audio"
      sub="Whisper transcribes, AI translates — 10 language pairs, right in your browser, free."
      badge="Beta · AI Translator"
      widget={<TranslatorWidget />}
      steps={[
        { title: 'Upload & pick a direction', text: 'Choose from 10 supported language pairs, then upload your audio or video.' },
        { title: 'Transcribe + translate', text: 'Whisper transcribes the speech, then a translation model converts every line.' },
        { title: 'Export or listen', text: 'Download translated subtitles, or hear the translation spoken aloud.' },
      ]}
      features={[
        { icon: '🌍', title: '10 language pairs', text: 'English ↔ Spanish, French, German, Italian and Chinese.' },
        { icon: '🤖', title: 'Two AI models', text: 'Whisper for speech, Opus-MT for translation — both on-device.' },
        { icon: '🔊', title: 'Spoken translation', text: 'Hear the result using your device\u2019s voices for that language.' },
        { icon: '📄', title: 'Subtitle export', text: 'Translated SRT and TXT with original timestamps.' },
        { icon: '💯', title: 'Free & private', text: 'No APIs, no uploads, no per-word fees.' },
        { icon: '⚡', title: 'Cached models', text: 'Each model downloads once, then works offline.' },
      ]}
      useCases={[
        { title: 'Video localization', text: 'Translate interviews and tutorials for new audiences.' },
        { title: 'Subtitles', text: 'Generate translated SRTs for YouTube and courses.' },
        { title: 'Language learning', text: 'Compare original and translated transcripts side by side.' },
        { title: 'Global teams', text: 'Make voice messages and meetings understandable.' },
      ]}
      faqs={[
        { q: 'Which languages are supported?', a: 'English ↔ Spanish, French, German, Italian and Chinese — 10 pairs total. We show the full list above the upload box, and more pairs are coming.' },
        { q: 'How good is the translation?', a: 'Opus-MT models are solid for everyday speech. Idioms and slang can be imperfect — review important translations.' },
        { q: 'Does the spoken translation sound natural?', a: 'It uses your device\u2019s built-in voices for the target language, so quality varies by device.' },
        { q: 'Is it free?', a: 'Yes — unlimited, no sign-up.' },
        { q: 'Is my audio private?', a: 'Completely. Both AI models run in your browser; nothing is uploaded.' },
      ]}
    />
  );
}
