import { useRef, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import { transcribeAudio, to16kMono, type TranscriptChunk } from '../lib/transcribeClient';
import { decodeAudioFile, formatTime } from '../lib/audio';
import { useRequireAuth } from '../lib/auth';

type Phase = 'idle' | 'loading' | 'transcribing' | 'done' | 'error';

function fmtSrt(t: number): string {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
function fmtVtt(t: number): string { return fmtSrt(t).replace(',', '.'); }

function TranscribeWidget() {
  const requireAuth = useRequireAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [fullText, setFullText] = useState('');
  const jobRef = useRef<{ cancel: () => void } | null>(null);

  const handleFile = async (file: File) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      const { left, right, sampleRate } = await decodeAudioFile(file);
      setPhase('transcribing');
      const mono16k = await to16kMono(left, right, sampleRate);
      const job = transcribeAudio(mono16k, (f, label) => { setProgress(f); setProgressLabel(label); });
      jobRef.current = job;
      const res = await job.promise;
      setChunks((res.chunks || []).map((c) => ({ ...c })));
      setFullText(res.text || '');
      setPhase('done');
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') { setPhase('idle'); return; }
      setError(`Transcription failed: ${(e as Error).message}`);
      setPhase('error');
    }
  };

  const updateChunk = (i: number, text: string) =>
    setChunks((cs) => cs.map((c, j) => (j === i ? { ...c, text } : c)));

  const download = (content: string | Blob, name: string, type: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  const exportTxt = () => {
    const text = chunks.length ? chunks.map((c) => c.text).join('\n') : fullText;
    download(text, `${fileName.replace(/\.[^.]+$/, '')}-transcript.txt`, 'text/plain');
  };
  const exportSrt = () => {
    const srt = chunks.map((c, i) => `${i + 1}\n${fmtSrt(c.timestamp[0])} --> ${fmtSrt(c.timestamp[1])}\n${c.text}\n`).join('\n');
    download(srt || fullText, `${fileName.replace(/\.[^.]+$/, '')}.srt`, 'text/plain');
  };
  const exportVtt = () => {
    const vtt = 'WEBVTT\n\n' + chunks.map((c) => `${fmtVtt(c.timestamp[0])} --> ${fmtVtt(c.timestamp[1])}\n${c.text}\n`).join('\n');
    download(vtt, `${fileName.replace(/\.[^.]+$/, '')}.vtt`, 'text/vtt');
  };
  const exportDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: `Transcript — ${fileName}`, heading: HeadingLevel.HEADING_1 }),
          ...chunks.flatMap((c) => [
            new Paragraph({ children: [new TextRun({ text: `[${formatTime(c.timestamp[0])}] `, bold: true }), new TextRun(c.text)] }),
          ]),
          ...(chunks.length ? [] : [new Paragraph(fullText)]),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    download(blob, `${fileName.replace(/\.[^.]+$/, '')}-transcript.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  };

  const reset = () => {
    setPhase('idle'); setChunks([]); setFullText(''); setError('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {phase === 'idle' && <UploadWidget onFile={(f) => requireAuth(() => handleFile(f))} accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.ogg,.webm" />}
      {phase === 'loading' && <p className="text-center py-12 text-muted">Reading {fileName}…</p>}
      {phase === 'transcribing' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mb-6">{progressLabel} ({Math.round(progress * 100)}%)</p>
          <button onClick={() => jobRef.current?.cancel()} className="px-6 py-2 rounded-full border border-border text-sm">Cancel</button>
          <p className="text-xs text-muted mt-4">Whisper tiny model downloads once (~40MB, cached), then runs fully offline.</p>
        </div>
      )}
      {phase === 'done' && (
        <div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mb-4">
            <h3 className="font-bold mb-1">Transcript — {fileName}</h3>
            <p className="text-xs text-muted mb-4">Click any line to edit it. Timestamps are preserved on export.</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chunks.length ? chunks.map((c, i) => (
                <div key={i} className="flex gap-3 items-start rounded-xl bg-background border border-border p-3">
                  <span className="text-xs text-muted whitespace-nowrap pt-1 font-mono">
                    {formatTime(c.timestamp[0])}
                  </span>
                  <textarea
                    value={c.text} onChange={(e) => updateChunk(i, e.target.value)}
                    rows={2} className="flex-1 bg-transparent text-sm outline-none resize-y"
                  />
                </div>
              )) : (
                <textarea value={fullText} onChange={(e) => setFullText(e.target.value)}
                  rows={8} className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportTxt} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">⬇ TXT</button>
            <button onClick={exportSrt} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ SRT</button>
            <button onClick={exportVtt} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ VTT</button>
            <button onClick={exportDocx} className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary">⬇ DOCX</button>
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

export default function AudioToTextPage() {
  return (
    <ToolPage
      path="/ai-audio-to-text"
      seoTitle="Audio to Text — Free AI Transcription in Your Browser | AI Music Remover"
      seoDescription="Transcribe audio and video to text with Whisper AI, free in your browser. Timestamps, editable transcript, export TXT, SRT, VTT and DOCX."
      h1="Turn Audio into Text — Free AI Transcription with Whisper"
      sub="Upload any podcast, interview, meeting recording, or video and our free AI transcription tool converts speech to text right in your browser. Powered by OpenAI\u2019s acclaimed Whisper model running locally on your device — with automatic language detection, precise timestamps, an editable transcript, and one-click export to TXT, SRT, VTT, or DOCX. No per-minute fees, no uploads, no sign-up."
      badge="Beta · Whisper AI"
      widget={<TranscribeWidget />}
      steps={[
        { title: 'Upload audio or video', text: 'Podcasts, interviews, lectures, meetings, YouTube videos — anything with speech. MP3, WAV, M4A, MP4, and more. Up to 10 minutes per file works best.' },
        { title: 'Whisper AI transcribes locally', text: 'OpenAI\u2019s Whisper model downloads once (~40MB, cached afterwards), then transcribes entirely on your device. It auto-detects the language and timestamps every segment — no audio ever leaves your browser.' },
        { title: 'Review and edit inline', text: 'Read through the transcript and click any line to fix misheard words. AI transcription is excellent but not perfect — a quick human pass catches names, jargon, and accents.' },
        { title: 'Export in your format', text: 'Download as plain TXT for notes, SRT or VTT for video subtitles and captions, or DOCX for polished documents. Your transcript is ready for whatever comes next.' },
      ]}
      features={[
        { icon: '🤖', title: 'Whisper AI, the real thing', text: 'We run OpenAI\u2019s acclaimed open-source Whisper model — the same technology behind the best transcription services — locally in your browser. Not a demo, not a trial.' },
        { icon: '🌍', title: 'Automatic language detection', text: 'Whisper recognizes dozens of languages automatically, from English, Spanish, and French to Hindi, Arabic, Mandarin, and beyond. No manual language selection needed.' },
        { icon: '⏱️', title: 'Precise timestamps', text: 'Every transcript segment is time-coded, so you can jump to any moment in the audio, generate perfectly synced subtitles, or cite exact quotes with confidence.' },
        { icon: '✏️', title: 'Fully editable transcript', text: 'Click any line to correct it inline before exporting. Fix proper nouns, technical terms, and accented speech — then export the polished version.' },
        { icon: '💯', title: 'Free with zero per-minute fees', text: 'Transcription services typically charge $0.25-1.00 per minute — a one-hour interview costs $15-60. Ours is unlimited and free, because your device does the work.' },
        { icon: '📄', title: 'Four export formats', text: 'TXT for notes and documents, SRT and VTT for video subtitles and closed captions, DOCX for sharing and printing. Every workflow covered.' },
      ]}
      useCases={[
        { title: 'Podcast show notes that rank on Google', text: 'Publish a full transcript alongside every episode. Search engines can\u2019t listen to audio, but they devour text — transcripts are the single highest-ROI SEO move for podcasters, and they make your content accessible to deaf and hard-of-hearing audiences.' },
        { title: 'Video subtitles and captions', text: 'Generate SRT or VTT caption files for YouTube, courses, and social videos. Captions boost watch time (most social video is watched on mute) and are legally required for many organizations.' },
        { title: 'Meeting notes you\u2019ll actually use', text: 'Record the meeting, transcribe it, and get searchable text instead of vague memories. Find that decision, that deadline, that action item — with timestamps to prove it.' },
        { title: 'Research interviews, analyzed properly', text: 'Journalists, academics, and UX researchers: transcribe hours of interviews and actually analyze them. Search across transcripts, pull exact quotes, and code themes — qualitative research without the transcription bill.' },
      ]}
      faqs={[
        { q: 'How accurate is Whisper AI transcription?', a: 'On clear speech in a quiet environment, Whisper is remarkably accurate — often 95%+ word accuracy for English, comparable to human transcription for straightforward content. It handles multiple speakers, natural conversational pace, and even mild background noise well. Accuracy drops with heavy accents it hasn\u2019t heard much of, multiple people talking over each other, very technical jargon, or music playing under speech. We use the "tiny" Whisper variant for speed (it transcribes roughly in real-time on a modern laptop); larger variants are more accurate but would be painfully slow in a browser. The editable transcript exists precisely because no AI is perfect — a quick human review pass catches the 5% that matters, like names and numbers.' },
        { q: 'Which languages does the transcription support?', a: 'Whisper was trained on 680,000 hours of multilingual audio and auto-detects the language — you don\u2019t need to tell it anything. It handles English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Hindi, Arabic, Mandarin, Japanese, Korean, and dozens more, including code-switching (mixing languages mid-sentence, common in South Asia and Latin America). Transcription quality is best for high-resource languages like English and Spanish; lower-resource languages work but with more errors. If your audio mixes languages, Whisper usually follows along — just review the transcript afterwards.' },
        { q: 'How long does transcription take?', a: 'After the one-time ~40MB model download (cached in your browser forever after), transcription runs at roughly real-time speed on a modern laptop — a 10-minute recording takes about 10 minutes to process, sometimes faster on powerful machines. Longer files take proportionally longer, and very old or mobile devices will be slower. You\u2019ll see live progress with the current segment being transcribed. Tip: for a 60-minute interview, start the transcription and grab a coffee — it\u2019ll be done when you get back, and it cost you exactly $0 versus $15-60 at a transcription service.' },
        { q: 'Is my audio uploaded to any server?', a: 'No — and this is a genuine architectural guarantee, not a privacy policy promise. The Whisper model downloads to your browser once, and every second of transcription computation happens locally using WebAssembly and your device\u2019s CPU. There is literally no server endpoint that receives your audio; the network tab will confirm zero audio uploads. This makes our transcriber suitable for sensitive material — legal interviews, medical dictation, unreleased content, confidential meetings — that you\u2019d never send to a cloud transcription API.' },
        { q: 'Why is this marked Beta?', a: 'We\u2019re transparent about current limits. The core transcription works reliably, but very long files (30+ minutes) can strain browser memory, speaker diarization (labeling "who said what") isn\u2019t implemented yet, and the tiny model trades some accuracy for speed. Rather than silently shipping limitations, we mark it Beta and tell you exactly what to expect. As we add the larger model option and diarization, the Beta tag comes off. What you get today is already more than enough for podcasts, videos, meetings, and interviews — honestly labeled.' },
        { q: 'How does free browser transcription compare to paid services?', a: 'Paid services (Otter, Rev, Descript) offer conveniences we don\u2019t yet: speaker labels, real-time transcription, team collaboration, and human review options. What we match or beat them on: raw transcription quality for clear audio (same Whisper family), privacy (nothing uploaded, ever), and price ($0 vs $10-30/month or per-minute fees). For solo creators, students, and researchers who need accurate transcripts of their own recordings, the free browser option covers 90% of use cases. If you need speaker diarization or a team workspace, the paid tools earn their keep — we\u2019re honest about that.' },
      ]}
    />
  );
}