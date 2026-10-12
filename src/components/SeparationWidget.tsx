import { useEffect, useRef, useState } from 'react';
import UploadWidget from './UploadWidget';
import ResultPlayer, { PlayerTrack } from './ResultPlayer';
import { runAudioJob, buffersToChannels, type JobResult } from '../lib/workerClient';
import { decodeAudioFile, resampleTo44100, encodeWav, mixStems, formatTime, deviceCapabilities } from '../lib/audio';
import { saveJob } from '../lib/history';

type Phase = 'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error';

interface StemAudio {
  vocals: [Float32Array, Float32Array];
  drums: [Float32Array, Float32Array];
  bass: [Float32Array, Float32Array];
  other: [Float32Array, Float32Array];
}

const MAX_MINUTES = 10;

/** Flagship widget: upload/record/link -> AI stem separation -> tabbed results. */
export default function SeparationWidget() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [durationSec, setDurationSec] = useState(0);
  const [longFile, setLongFile] = useState(false);
  const [mode, setMode] = useState<'ai' | 'fast'>('ai');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [mixGains, setMixGains] = useState({ vocals: 0.8, music: 0.8, other: 0.8 });
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const audioRef = useRef<{ left: Float32Array; right: Float32Array; sampleRate: number } | null>(null);
  const stemsRef = useRef<StemAudio | null>(null);
  const jobRef = useRef<{ cancel: () => void } | null>(null);
  const weakDevice = deviceCapabilities().weak;

  useEffect(() => () => {
    jobRef.current?.cancel();
    Object.values(downloadUrls).forEach((u) => URL.revokeObjectURL(u));
    tracks.forEach((t) => { if (t.url.startsWith('blob:')) URL.revokeObjectURL(t.url); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File) => {
    setError('');
    setPhase('loading');
    setFileName(file.name);
    try {
      const { left, right, sampleRate, duration } = await decodeAudioFile(file);
      setDurationSec(duration);
      setLongFile(duration > MAX_MINUTES * 60);
      const [rL, rR] = await resampleTo44100(left, right, sampleRate);
      audioRef.current = { left: rL, right: rR, sampleRate: 44100 };
      setPhase('ready');
    } catch {
      setError('Could not read that file. Try MP3, WAV, M4A or MP4.');
      setPhase('error');
    }
  };

  const startSeparation = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPhase('processing');
    setProgress(0);
    setProgressLabel(mode === 'ai' ? 'Starting…' : 'Separating (instant mode)…');
    // Transfer copies: the worker takes ownership of the posted buffers.
    const left = audio.left.slice();
    const right = audio.right.slice();
    const job = runAudioJob(
      mode === 'ai' ? 'separate' : 'separateFast',
      { left, right },
      (f, label) => { setProgress(f); setProgressLabel(label); },
    );
    jobRef.current = job;
    job.promise.then(
      (result) => buildResults(result),
      (err) => {
        if ((err as DOMException).name === 'AbortError') { setPhase('ready'); return; }
        setError(`Separation failed: ${(err as Error).message}. Try Instant mode or a shorter file.`);
        setPhase('error');
      },
    );
  };

  const buildResults = (result: JobResult) => {
    if (result.kind === 'audio') {
      setError('Unexpected result from audio worker.');
      setPhase('error');
      return;
    }
    const sr = result.sampleRate ?? 44100;
    let stems: StemAudio;
    if (result.kind === 'stemsFast') {
      const [vL, vR] = buffersToChannels(result.stems.vocals);
      const [mL, mR] = buffersToChannels(result.stems.music);
      const silent: [Float32Array, Float32Array] = [new Float32Array(vL.length), new Float32Array(vL.length)];
      stems = { vocals: [vL, vR], drums: [mL, mR], bass: silent, other: silent };
    } else {
      const get = (n: string) => buffersToChannels(result.stems[n]);
      stems = { vocals: get('vocals'), drums: get('drums'), bass: get('bass'), other: get('other') };
    }
    stemsRef.current = stems;
    const audio = audioRef.current!;

    const toUrl = (l: Float32Array, r: Float32Array) => URL.createObjectURL(encodeWav(l, r, sr));
    const music = mixStems({ drums: stems.drums, bass: stems.bass }, { drums: 1, bass: 1 });

    const urls: Record<string, string> = {
      original: toUrl(audio.left, audio.right),
      vocals: toUrl(...stems.vocals),
      music: toUrl(...music),
      other: toUrl(...stems.other),
    };
    setDownloadUrls(urls);
    setTracks([
      { id: 'original', label: 'Original', url: urls.original },
      { id: 'vocals', label: 'Vocal', url: urls.vocals },
      { id: 'music', label: 'Background Music', url: urls.music },
      { id: 'other', label: 'Other', url: urls.other },
      { id: 'custom', label: 'Custom Mix', url: urls.original },
    ]);
    setPhase('done');
    // Save to local history (fire-and-forget)
    saveJob({
      id: `job-${Date.now()}`,
      tool: 'Music Remover',
      fileName,
      createdAt: Date.now(),
      durationSec,
      stems: {
        vocals: encodeWav(...stems.vocals, sr),
        music: encodeWav(...music, sr),
        other: encodeWav(...stems.other, sr),
      },
    }).catch(() => {});
  };

  const updateMix = (key: 'vocals' | 'music' | 'other', val: number) => {
    const gains = { ...mixGains, [key]: val };
    setMixGains(gains);
    const stems = stemsRef.current;
    if (!stems) return;
    const [mL, mR] = mixStems(
      { vocals: stems.vocals, drums: stems.drums, bass: stems.bass, other: stems.other },
      { vocals: gains.vocals, drums: gains.music, bass: gains.music, other: gains.other },
    );
    const url = URL.createObjectURL(encodeWav(mL, mR, 44100));
    setTracks((ts) => ts.map((t) => (t.id === 'custom' ? { ...t, url } : t)));
  };

  const download = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  const downloadAll = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const base = fileName.replace(/\.[^.]+$/, '') || 'audio';
    for (const [key, url] of Object.entries(downloadUrls)) {
      const blob = await (await fetch(url)).blob();
      zip.file(`${base}-${key}.wav`, blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    download(URL.createObjectURL(blob), `${base}-stems.zip`);
  };

  const reset = () => {
    jobRef.current?.cancel();
    setPhase('idle');
    setTracks([]);
    setError('');
    audioRef.current = null;
    stemsRef.current = null;
  };

  return (
    <div id="tool-widget">
      {phase === 'idle' && <UploadWidget onFile={handleFile} maxMinutes={MAX_MINUTES} />}

      {phase === 'loading' && (
        <div className="text-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted">Reading {fileName}…</p>
        </div>
      )}

      {phase === 'ready' && (
        <div className="max-w-2xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <h3 className="font-bold text-lg mb-1 truncate">{fileName}</h3>
          <p className="text-sm text-muted mb-5">Duration: {formatTime(durationSec)}</p>
          {longFile && (
            <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              ⚠️ This file is longer than the recommended {MAX_MINUTES} minutes. Separation may take a
              while and use significant memory. Consider trimming it first.
            </p>
          )}
          {weakDevice && (
            <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              ⚠️ Your device looks modest — AI mode may be slow. Instant mode is recommended.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setMode('ai')}
              className={`rounded-2xl border-2 p-4 text-left ${mode === 'ai' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="font-bold">🤖 AI Separation</div>
              <div className="text-xs text-muted mt-1">Best quality. Downloads a ~80MB model once, then runs fully offline.</div>
            </button>
            <button
              onClick={() => setMode('fast')}
              className={`rounded-2xl border-2 p-4 text-left ${mode === 'fast' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="font-bold">⚡ Instant Mode</div>
              <div className="text-xs text-muted mt-1">Immediate result, no download. Good for centered vocals.</div>
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={startSeparation} className="flex-1 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Separate stems
            </button>
            <button onClick={reset} className="px-6 py-3 rounded-full border border-border font-medium">
              New file
            </button>
          </div>
          <p className="text-xs text-muted mt-4 text-center">
            By processing, you confirm you have the rights to this content.
          </p>
        </div>
      )}

      {phase === 'processing' && (
        <div className="max-w-2xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 text-center">
          <h3 className="font-bold text-lg mb-4 truncate">{fileName}</h3>
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-sm text-muted mb-6">{progressLabel} ({Math.round(progress * 100)}%)</p>
          <button
            onClick={() => { jobRef.current?.cancel(); }}
            className="px-6 py-2 rounded-full border border-border font-medium text-sm"
          >
            Cancel
          </button>
          <p className="text-xs text-muted mt-4">First run downloads the AI model (~80MB, cached afterwards).</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="max-w-3xl mx-auto">
          <ResultPlayer tracks={tracks} />
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mt-4">
            <h3 className="font-bold mb-4">Custom mix</h3>
            {(['vocals', 'music', 'other'] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 mb-3 text-sm">
                <span className="w-36 capitalize font-medium">{k === 'music' ? 'Background music' : k}</span>
                <input
                  type="range" min={0} max={100} value={Math.round(mixGains[k] * 100)}
                  onChange={(e) => updateMix(k, Number(e.target.value) / 100)}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <span className="w-12 text-right text-muted">{Math.round(mixGains[k] * 100)}%</span>
              </label>
            ))}
            <p className="text-xs text-muted">Adjust the sliders, then switch to the “Custom Mix” tab to preview.</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              ['original', 'Original'], ['vocals', 'Vocal'], ['music', 'Background Music'], ['other', 'Other'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => download(downloadUrls[key], `${fileName.replace(/\.[^.]+$/, '')}-${key}.wav`)}
                className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary"
              >
                ⬇ {label} (WAV)
              </button>
            ))}
            <button onClick={downloadAll} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">
              ⬇ All stems (ZIP)
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-full border border-border text-sm font-medium">
              New file
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-danger mb-6">{error}</p>
          <button onClick={reset} className="px-8 py-3 rounded-full bg-primary text-white font-semibold">
            Try another file
          </button>
        </div>
      )}
    </div>
  );
}
