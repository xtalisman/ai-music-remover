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
      h1="Translate Audio to Another Language — Free AI Audio Translator"
      sub="Upload a podcast, interview, video, or voice message and our free AI audio translator transcribes the speech with Whisper, then translates every line into your target language — 10 language pairs including English, Spanish, French, German, Italian, and Chinese. Download translated subtitles, read the side-by-side transcript, or hear the translation spoken aloud. All in your browser, all private, all free."
      badge="Beta · AI Translator"
      widget={<TranslatorWidget />}
      steps={[
        { title: 'Choose your language pair', text: 'Pick from 10 supported directions — English to Spanish, French, German, Italian, or Chinese, and back. The translation models download once (~100MB per pair) and are cached for offline use.' },
        { title: 'Upload your audio or video', text: 'Podcasts, interviews, lectures, YouTube videos, voice messages — anything with speech. Up to 10 minutes per file for the smoothest experience.' },
        { title: 'AI transcribes, then translates', text: 'Whisper first converts speech to text in the original language (with timestamps), then the Opus-MT translation model converts every line — all on your device, no audio ever uploaded.' },
        { title: 'Read, listen, or export', text: 'Compare original and translated transcripts side by side, hear the translation spoken in the target language, or download translated SRT subtitles and TXT files.' },
      ]}
      features={[
        { icon: '🌍', title: '10 language pairs', text: 'English ↔ Spanish, French, German, Italian, and Chinese — covering the languages spoken by billions of people. More pairs are on the roadmap.' },
        { icon: '🤖', title: 'Two AI models, zero servers', text: 'Whisper handles speech recognition, Opus-MT (the Helsinki-NLP open translation models) handles translation. Both run locally via WebAssembly — no API keys, no per-word fees.' },
        { icon: '🔊', title: 'Hear the spoken translation', text: 'Listen to the translated text read aloud using your device\u2019s built-in voices for the target language. Perfect for checking how your content sounds to the new audience.' },
        { icon: '📄', title: 'Translated subtitle export', text: 'Download SRT files with the original timestamps but translated text — drop them straight into YouTube, Premiere, or any video platform for instant multilingual captions.' },
        { icon: '💯', title: 'Free with no per-word charges', text: 'Translation APIs charge per character — translating a one-hour podcast can cost $10-20. Ours is unlimited and free because your device does all the work.' },
        { icon: '🔒', title: 'Private by architecture', text: 'Sensitive interviews, confidential meetings, unreleased content — none of it ever leaves your browser. There\u2019s no server to intercept, subpoena, or breach.' },
      ]}
      useCases={[
        { title: 'Localize videos for global audiences', text: 'YouTubers and course creators: translate your English tutorials into Spanish, French, or Chinese and 10x your potential audience. Upload once, get translated subtitles ready for YouTube\u2019s multi-language audio tracks.' },
        { title: 'Make content accessible across languages', text: 'NGOs, educators, and companies: ensure your message reaches everyone, regardless of language. Translate training videos, announcements, and explainers without hiring a translation agency.' },
        { title: 'Learn languages with real content', text: 'Students: compare the original and translated transcripts side by side to see how natives actually phrase things. It\u2019s like having a bilingual friend explain every line of your favorite podcast.' },
        { title: 'Understand global teams and clients', text: 'Received a voice message in German? An interview in Mandarin? Translate it in seconds and actually understand what was said — no more guessing from auto-generated gibberish captions.' },
      ]}
      faqs={[
        { q: 'Which languages can I translate between?', a: 'We currently support 10 language pairs: English → Spanish, French, German, Italian, and Chinese, plus the reverse (Spanish → English, French → English, German → English, Italian → English, Chinese → English). These cover the most requested combinations — the languages of the largest YouTube, podcast, and business audiences. Each direction uses a dedicated Opus-MT translation model (developed by the University of Helsinki\u2019s language technology group) that downloads once (~100MB) and is cached in your browser. We\u2019re actively working on adding Portuguese, Japanese, Korean, Hindi, and Arabic pairs — the models exist, we\u2019re optimizing them for browser delivery.' },
        { q: 'How accurate is the AI translation?', a: 'The pipeline has two stages, each with its own accuracy profile. Stage one (Whisper transcription) is excellent on clear speech — 95%+ for English. Stage two (Opus-MT translation) produces solid, natural translations for everyday speech, news-style content, and straightforward narration. It handles grammar and common expressions well. Where it struggles: idioms ("it\u2019s raining cats and dogs" won\u2019t translate literally well), slang, wordplay, cultural references, and highly technical jargon. For casual content and getting the gist, it\u2019s excellent. For legal, medical, or publish-ready literary translation, always have a native speaker review. Think of it as a very capable assistant, not a certified translator.' },
        { q: 'How does the spoken translation feature work?', a: 'After translation, you can hear the translated text read aloud using your device\u2019s built-in text-to-speech voices for the target language (via the Web Speech API). So an English-to-Spanish translation will be spoken by your device\u2019s Spanish voice. Quality varies by device — Apple and Microsoft\u2019s neural voices sound remarkably natural, while older system voices can sound robotic. This is great for checking how your translated content flows when spoken, for accessibility, or for language learners practicing pronunciation. It\u2019s not a voice clone of the original speaker — it\u2019s the translation read by a synthetic voice.' },
        { q: 'Why do the translation models take a while to download?', a: 'Each language pair needs its own translation model (~100MB), plus the Whisper transcription model (~40MB). That\u2019s the price of running real AI locally instead of calling a cloud API. The good news: it\u2019s a one-time download per language pair, cached permanently in your browser. After that, translations start instantly and work completely offline — on a plane, in a basement studio, anywhere. Compare that to API-based translators that need internet forever and charge per character. The 2-minute download today saves you money and works offline forever.' },
        { q: 'Is my audio really private? How can translation work without servers?', a: 'Yes — genuinely private, by architecture rather than by promise. Both AI models (Whisper for transcription, Opus-MT for translation) are downloaded to your browser and execute locally using WebAssembly. Your audio is decoded, transcribed, and translated entirely on your device\u2019s CPU. There is no API endpoint that receives your audio or text — you can verify this in your browser\u2019s network tab. This is fundamentally different from Google Translate or cloud transcription services, where your content is sent to corporate servers. For journalists, lawyers, researchers, and anyone handling sensitive multilingual content, this privacy guarantee matters.' },
        { q: 'What\u2019s the difference between this and Google Translate\u2019s audio feature?', a: 'Google Translate is excellent and we won\u2019t pretend otherwise — it supports 130+ languages (we have 10 pairs), has better handling of rare languages, and benefits from Google\u2019s massive training data. Where we win: privacy (Google processes your audio on their servers; we never upload anything), cost at scale (Google\u2019s API charges per character beyond free tiers; we\u2019re unlimited), offline capability (we work without internet after the one-time download), and subtitle export with original timestamps (purpose-built for creators). For quick casual translations of short phrases, Google is convenient. For private, unlimited, subtitle-ready translation of your own audio content, our tool is the better choice.' },
      ]}
    />
  );
}
