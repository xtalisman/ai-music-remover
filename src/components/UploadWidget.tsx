import { useRef, useState } from 'react';

interface UploadWidgetProps {
  onFile: (file: File, kind: 'upload' | 'record' | 'link' | 'screen') => void;
  accept?: string;
  maxMinutes?: number;
  compact?: boolean;
}

const ACCEPT_DEFAULT = 'audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.avi,.3gp,.ogg,.flac,.webm';

/**
 * Upload widget: drag-and-drop + file picker, record audio (mic),
 * paste link (direct CORS-enabled media URLs only, with a clear error),
 * record screen (MediaRecorder). Shows supported formats + honest length note.
 */
export default function UploadWidget({ onFile, accept = ACCEPT_DEFAULT, maxMinutes = 10, compact }: UploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const pick = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onFile(files[0], 'upload');
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRecorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        onFile(new File([blob], `recording.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type }), 'record');
        setRecording(false);
      };
      mediaRecorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert('Microphone access was blocked. Please allow microphone access and try again.');
    }
  };

  const recordScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        onFile(new File([blob], 'screen-recording.webm', { type: 'video/webm' }), 'screen');
      };
      rec.start();
      // stop when the user stops sharing
      stream.getVideoTracks()[0].onended = () => rec.stop();
      alert('Recording screen — use the browser’s stop-sharing control when finished.');
    } catch {
      /* user cancelled */
    }
  };

  const submitLink = async () => {
    setLinkError('');
    const url = linkUrl.trim();
    if (!url) return;
    try {
      // Probe with a range request: proves the URL is direct + CORS-enabled.
      const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      const blob = await (await fetch(url)).blob();
      const name = url.split('/').pop()?.split('?')[0] || 'linked-media';
      onFile(new File([blob], name, { type: blob.type || 'audio/mpeg' }), 'link');
      setLinkOpen(false);
      setLinkUrl('');
    } catch {
      setLinkError(
        'Could not fetch that link. Paste Link only works for direct media file URLs ' +
        '(ending in .mp3, .wav, .mp4, …) that allow cross-origin access. ' +
        'Streaming pages (YouTube, Spotify, SoundCloud) are not supported — download the file first, then upload it.',
      );
    }
  };

  return (
    <div className={`w-full ${compact ? '' : 'max-w-3xl mx-auto'}`}>
      <div
        onClick={pick}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-[var(--radius-card)] border-2 border-dashed transition-colors p-8 md:p-12 text-center bg-surface ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="text-4xl mb-3">🎵</div>
        <div className="font-semibold text-lg">Drag &amp; drop your audio or video here</div>
        <div className="text-muted text-sm mt-1">or</div>
        <span className="inline-block mt-3 px-8 py-3 rounded-full bg-primary text-white font-semibold">
          Upload file
        </span>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <button
            onClick={(e) => { e.stopPropagation(); toggleRecord(); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${recording ? 'bg-danger text-white border-danger' : 'border-border hover:border-primary'}`}
          >
            {recording ? '⏹ Stop recording' : '🎤 Record audio'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); recordScreen(); }}
            className="px-4 py-2 rounded-full text-sm font-medium border border-border hover:border-primary"
          >
            🖥️ Record screen
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLinkOpen((v) => !v); }}
            className="px-4 py-2 rounded-full text-sm font-medium border border-border hover:border-primary"
          >
            🔗 Paste link
          </button>
        </div>
        {linkOpen && (
          <div className="mt-4 flex gap-2 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/song.mp3"
              className="flex-1 px-4 py-2 rounded-full border border-border bg-background text-sm"
            />
            <button onClick={submitLink} className="px-5 py-2 rounded-full bg-secondary text-white text-sm font-semibold">
              Fetch
            </button>
          </div>
        )}
        {linkError && <p className="mt-3 text-sm text-danger max-w-md mx-auto">{linkError}</p>}
      </div>
      <p className="text-center text-xs text-muted mt-3">
        MP3, WAV, M4A, MP4, MOV, AVI, 3GP, OGG, FLAC, WEBM · Recommended up to {maxMinutes} minutes
        (longer files show a warning) · Processed 100% on your device — nothing is uploaded.
      </p>
    </div>
  );
}
