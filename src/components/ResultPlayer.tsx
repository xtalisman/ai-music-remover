import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../lib/audio';

export interface PlayerTrack {
  id: string;
  label: string;
  url: string; // object URL or public path
}

/** Tabbed audio player with synchronized transport (used by tool results + home demo). */
export default function ResultPlayer({ tracks }: { tracks: PlayerTrack[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = tracks[active];

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const wasPlaying = playing;
    el.src = current.url;
    el.load();
    setTime(0);
    if (wasPlaying) el.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else el.play().then(() => setPlaying(true)).catch(() => {});
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6 shadow-[var(--shadow-card)]">
      <audio ref={audioRef} preload="metadata" />
      <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Tracks">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              i === active ? 'bg-primary text-white' : 'bg-surface-2 hover:bg-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-12 h-12 shrink-0 rounded-full bg-accent text-[var(--color-accent-text)] grid place-items-center text-xl font-bold"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-surface-2 cursor-pointer" onClick={seek}>
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: duration ? `${(time / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{formatTime(time)}</span>
            <span className="font-medium text-ink">{current.label}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
