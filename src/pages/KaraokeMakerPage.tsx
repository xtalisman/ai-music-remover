import { useEffect, useState } from 'react';
import ToolPage from '../components/ToolPage';
import UploadWidget from '../components/UploadWidget';
import ResultPlayer from '../components/ResultPlayer';
import { useSeparation } from '../hooks/useSeparation';
import { runAudioJob, buffersToChannels } from '../lib/workerClient';
import { encodeWav, formatTime } from '../lib/audio';
import { encodeMp3 } from '../lib/mp3';
import { saveJob } from '../lib/history';

function KaraokeWidget() {
  const s = useSeparation();
  const [semitones, setSemitones] = useState(0);
  const [tempo, setTempo] = useState(1);
  const [processingFx, setProcessingFx] = useState(false);
  const [fxLabel, setFxLabel] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [finalAudio, setFinalAudio] = useState<[Float32Array, Float32Array] | null>(null);
  const [encoding, setEncoding] = useState(false);

  const applyFx = async () => {
    if (!s.stems) return;
    setProcessingFx(true);
    try {
      let [l, r] = [s.stems.instrumental[0].slice(), s.stems.instrumental[1].slice()];
      if (Math.abs(semitones) > 0.01) {
        setFxLabel(`Shifting key by ${semitones > 0 ? '+' : ''}${semitones} semitones…`);
        const job = runAudioJob('pitchShift', { left: l, right: r, semitones }, (f, label) => setFxLabel(`${label} (${Math.round(f * 100)}%)`));
        const res = await job.promise;
        if (res.kind !== 'audio') throw new Error('pitch shift failed');
        l = new Float32Array(res.left); r = new Float32Array(res.right);
      }
      if (Math.abs(tempo - 1) > 0.005) {
        setFxLabel(`Changing tempo to ${tempo.toFixed(2)}×…`);
        const job = runAudioJob('timeStretch', { left: l, right: r, rate: 1 / tempo }, (f, label) => setFxLabel(`${label} (${Math.round(f * 100)}%)`));
        const res = await job.promise;
        if (res.kind !== 'audio') throw new Error('tempo change failed');
        l = new Float32Array(res.left); r = new Float32Array(res.right);
      }
      setFinalAudio([l, r]);
      const url = URL.createObjectURL(encodeWav(l, r, s.stems.sampleRate));
      setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    } catch (e) {
      alert(`Effect failed: ${(e as Error).message}`);
    } finally {
      setProcessingFx(false);
    }
  };

  // When stems first arrive, the track is the plain instrumental
  useEffect(() => {
    if (s.phase === 'done' && s.stems && !trackUrl) {
      const [l, r] = s.stems.instrumental;
      setFinalAudio([l.slice(), r.slice()]);
      setTrackUrl(URL.createObjectURL(encodeWav(l, r, s.stems.sampleRate)));
      saveJob({
        id: `job-${Date.now()}`, tool: 'Karaoke Maker', fileName: s.fileName,
        createdAt: Date.now(), durationSec: s.durationSec,
        stems: { karaoke: encodeWav(l, r, s.stems.sampleRate) },
      }).catch(() => {});
    }
    if (s.phase === 'idle') { setTrackUrl(''); setFinalAudio(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.stems]);

  const download = async (fmt: 'wav' | 'mp3') => {
    if (!finalAudio || !s.stems) return;
    setEncoding(true);
    try {
      const base = s.fileName.replace(/\.[^.]+$/, '') || 'karaoke';
      const blob = fmt === 'wav'
        ? encodeWav(finalAudio[0], finalAudio[1], s.stems.sampleRate)
        : await encodeMp3(finalAudio[0], finalAudio[1], s.stems.sampleRate);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-karaoke.${fmt}`;
      a.click();
    } finally {
      setEncoding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {s.phase === 'idle' && <UploadWidget onFile={s.loadFile} />}
      {s.phase === 'loading' && <p className="text-center py-12 text-muted">Reading {s.fileName}…</p>}
      {s.phase === 'ready' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 text-center">
          <h3 className="font-bold truncate">{s.fileName}</h3>
          <p className="text-sm text-muted mb-6">Duration: {formatTime(s.durationSec)}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => s.separate('ai')} className="px-8 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
              Make karaoke track
            </button>
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
      {s.phase === 'done' && trackUrl && (
        <div>
          <ResultPlayer tracks={[{ id: 'karaoke', label: 'Karaoke Track', url: trackUrl }]} />
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 mt-4">
            <h3 className="font-bold mb-4">Adjust key &amp; tempo</h3>
            <label className="flex items-center gap-3 mb-3 text-sm">
              <span className="w-24 font-medium">Key</span>
              <input type="range" min={-6} max={6} step={1} value={semitones}
                onChange={(e) => setSemitones(Number(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-20 text-right text-muted">{semitones > 0 ? '+' : ''}{semitones} st</span>
            </label>
            <label className="flex items-center gap-3 mb-4 text-sm">
              <span className="w-24 font-medium">Tempo</span>
              <input type="range" min={0.7} max={1.4} step={0.01} value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]" />
              <span className="w-20 text-right text-muted">{tempo.toFixed(2)}×</span>
            </label>
            <button onClick={applyFx} disabled={processingFx}
              className="px-6 py-2 rounded-full bg-secondary text-white text-sm font-semibold disabled:opacity-50">
              {processingFx ? 'Applying…' : 'Apply key & tempo'}
            </button>
            {processingFx && <p className="text-xs text-muted mt-2">{fxLabel}</p>}
          </div>
          <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4 mt-4 text-sm text-muted">
            🎤 <strong>Synced lyrics display</strong> is coming with our AI transcription update —
            lyrics will be generated automatically and highlight line by line.
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => download('mp3')} disabled={encoding}
              className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50">
              ⬇ Karaoke (MP3)
            </button>
            <button onClick={() => download('wav')} disabled={encoding}
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:border-primary disabled:opacity-50">
              ⬇ Karaoke (WAV)
            </button>
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

export default function KaraokeMakerPage() {
  return (
    <ToolPage
      path="/karaoke-maker"
      seoTitle="Karaoke Maker — Remove Vocals & Change Key/Tempo Free | AI Music Remover"
      seoDescription="Turn any song into a karaoke track: AI removes the vocals, then adjust key and tempo. Download MP3 free in your browser."
      h1="Turn Any Song into a Karaoke Track — Free AI Karaoke Maker"
      sub="Upload any song and our free AI karaoke maker removes the vocals, leaving a clean instrumental backing track. Then shift the key up or down to match your voice and adjust the tempo for practice. Download your karaoke track as MP3 or WAV — right in your browser, no sign-up, no cost."
      badge="AI Karaoke Maker"
      widget={<KaraokeWidget />}
      steps={[
        { title: 'Upload any song', text: 'Drop in an MP3, WAV, or M4A — our AI analyzes the mix and strips out the lead vocals, leaving the full instrumental behind.' },
        { title: 'Set your key and tempo', text: 'Shift the pitch up or down by semitones to match your vocal range, and slow down tricky passages for practice — pitch and tempo adjust independently.' },
        { title: 'Preview your backing track', text: 'Listen to the instrumental with your adjustments applied. Tweak the key and speed until it feels perfect for your voice.' },
        { title: 'Download and perform', text: 'Export your finished karaoke track as MP3 for sharing or WAV for the best quality. Take it to karaoke night, the studio, or the stage.' },
      ]}
      features={[
        { icon: '🎤', title: 'True AI vocal removal', text: 'A trained neural network isolates and removes the lead vocal — dramatically cleaner than old center-channel cancellation tricks that also gut the bass and drums.' },
        { icon: '🎹', title: 'Key change ±6 semitones', text: 'Shift the entire track up or down to sit in your comfortable singing range. The phase-vocoder keeps the tempo locked while the pitch moves.' },
        { icon: '⏱️', title: 'Independent tempo control', text: 'Slow a fast song down to learn it, or speed up a ballad — the pitch stays exactly where you set it. Perfect for practice and performance prep.' },
        { icon: '💯', title: 'Free with no limits', text: 'Make as many karaoke tracks as you want. No credits, no watermarks, no accounts, no "premium" key-change locked behind a paywall.' },
        { icon: '🔒', title: 'Private by design', text: 'Your songs are processed entirely in your browser. They\u2019re never uploaded to a server, so your music library stays yours.' },
        { icon: '🎵', title: 'MP3 and WAV export', text: 'Download MP3 for easy sharing and phone playback, or WAV for maximum quality when you\u2019re performing through a real PA system.' },
      ]}
      useCases={[
        { title: 'Karaoke night, your way', text: 'Make sing-along versions of songs that never got an official karaoke release — obscure B-sides, new releases, or your own originals. Be the hero of karaoke night.' },
        { title: 'Vocal practice that adapts to you', text: 'Shift a song down two semitones so it sits in your range, then slow the chorus to 80% speed while you learn the runs. Gradually bring it back up to full speed as you improve.' },
        { title: 'Build your gig setlist', text: 'Singers and bands: create a full set of backing tracks, each in the right key for your voice, ready to play through the PA. No more awkward on-stage transposing.' },
        { title: 'Content for covers and tutorials', text: 'YouTubers and vocal coaches: generate clean instrumental beds for cover videos, reaction content, and singing tutorials without hunting for licensed karaoke versions.' },
      ]}
      faqs={[
        { q: 'How does the AI karaoke maker remove vocals?', a: 'Our karaoke maker uses the same neural stem-separation technology as our vocal remover: a trained AI model analyzes your song\u2019s spectrogram and separates the lead vocal from everything else — drums, bass, guitars, keyboards, and backing instruments. Unlike old-fashioned "vocal remover" effects that simply delete the center channel (which also removes the kick drum, bass, and anything else panned center), the AI understands what a human voice sounds like and removes just that. The result is a full, rich instrumental that sounds like a real backing track, not a hollowed-out MP3. The AI model runs entirely in your browser, so your music never leaves your device.' },
        { q: 'How do I change the key of a song without changing its speed?', a: 'After the vocals are removed, use the key control to shift the pitch up or down in semitones (half-steps). Our pitch shifter uses a phase-vocoder algorithm: it analyzes the audio in tiny overlapping windows, shifts each window\u2019s frequencies, and reassembles them — so a +2 semitone shift makes everything sound two half-steps higher while the song stays exactly the same length. This is the same principle behind professional tools like Ableton\u2019s Complex Pro mode. You can shift up to 6 semitones in either direction, which covers the difference between most vocal ranges.' },
        { q: 'Will backing vocals and harmonies also be removed?', a: 'The AI primarily targets the lead vocal — the main singing voice. Quiet backing vocals, harmonies, and ad-libs are often mixed with heavy effects and panned wide like instruments, so the model may treat them as part of the instrumental and leave them in. In practice, this is usually fine for karaoke: faint background harmonies actually make the track sound fuller, like a real karaoke disc. If you want absolutely everything vocal removed, try our 4-stem Audio Splitter and mute the vocals stem entirely — though heavily effected backing vocals can still leave traces.' },
        { q: 'Can I slow down a song to practice without changing the pitch?', a: 'Yes — tempo and pitch are fully independent. The tempo control uses time-stretching to make the song play slower or faster while keeping the pitch exactly where it is. Slow a lightning-fast chorus to 70% speed to learn every note, then gradually work back up to 100%. Or speed up a slow ballad for an energetic performance. The time-stretching preserves the natural character of the instruments, so it doesn\u2019t sound like a chipmunk tape — just the same song at a different speed.' },
        { q: 'Is the karaoke maker really free? What\u2019s the catch?', a: 'There\u2019s no catch. It\u2019s free because all the processing — the AI vocal removal, the pitch shifting, the time stretching — happens on your device using your computer\u2019s processor. We don\u2019t run expensive servers, so we don\u2019t need to charge you or show you ads. No accounts, no watermarks on your downloads, no limit on how many karaoke tracks you make. The AI model downloads once (~80MB) and is cached in your browser for future visits.' },
        { q: 'Can I use these karaoke tracks for public performance or YouTube?', a: 'Technically you can download and play them anywhere, but the legal side matters: creating a karaoke version of a song does not give you performance, distribution, or synchronization rights. Singing it at a private party is generally fine. Posting a cover video to YouTube usually works because YouTube has licensing deals with most publishers (they may place ads or share revenue with the rights holder). Performing it at a paid venue typically requires the venue to hold a performance license (most do). When in doubt — especially for commercial releases — consult a music licensing professional. And as always, only process songs you have the right to use.' },
      ]}
    />
  );
}
