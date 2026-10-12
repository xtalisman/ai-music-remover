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
      h1="Turn audio into text"
      sub="Whisper AI transcribes your audio or video right in the browser — with timestamps, editable text and one-click exports."
      badge="Beta · Whisper AI"
      widget={<TranscribeWidget />}
      steps={[
        { title: 'Upload audio or video', text: 'Podcasts, interviews, meetings, videos — anything with speech.' },
        { title: 'AI transcribes', text: 'Whisper runs on your device, detects the language and timestamps every line.' },
        { title: 'Edit & export', text: 'Fix any words inline, then download TXT, SRT, VTT or DOCX.' },
      ]}
      features={[
        { icon: '🤖', title: 'Whisper AI', text: 'The acclaimed open-source speech model, running locally.' },
        { icon: '🌍', title: 'Auto language detect', text: 'Dozens of languages recognized automatically.' },
        { icon: '⏱️', title: 'Timestamps', text: 'Every segment is timed for subtitles and captions.' },
        { icon: '✏️', title: 'Editable', text: 'Click any line to correct it before exporting.' },
        { icon: '💯', title: 'Free & private', text: 'No per-minute fees; your audio never leaves your device.' },
        { icon: '📄', title: '4 export formats', text: 'TXT, SRT, VTT and DOCX for any workflow.' },
      ]}
      useCases={[
        { title: 'Podcast show notes', text: 'Transcribe episodes for SEO and accessibility.' },
        { title: 'Subtitles', text: 'Generate SRT/VTT captions for videos.' },
        { title: 'Meeting notes', text: 'Turn recordings into searchable text.' },
        { title: 'Research', text: 'Transcribe interviews for analysis.' },
      ]}
      faqs={[
        { q: 'How accurate is it?', a: 'Whisper tiny is fast and good for clear speech. Heavy accents, crosstalk or background music reduce accuracy — the editable transcript lets you fix mistakes quickly.' },
        { q: 'Which languages are supported?', a: 'Whisper auto-detects dozens of languages, from English and Spanish to Hindi, Arabic and Mandarin.' },
        { q: 'How long does it take?', a: 'Roughly real-time on a modern laptop after the one-time ~40MB model download. Longer files take proportionally longer.' },
        { q: 'Is my audio uploaded anywhere?', a: 'No. The model downloads to your browser and everything runs on your device.' },
        { q: 'Is it free?', a: 'Yes — unlimited transcription, no sign-up, no per-minute charges.' },
      ]}
    />
  );
}