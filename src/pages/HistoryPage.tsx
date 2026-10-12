import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { listJobs, getJob, deleteJob, clearJobs } from '../lib/history';

type JobSummary = Awaited<ReturnType<typeof listJobs>>[number];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setJobs(await listJobs());
    } catch {
      setError('Could not read local history. Your browser may be blocking IndexedDB storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteJob(id);
      setJobs((js) => js.filter((j) => j.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusyId('__clear__');
    try {
      await clearJobs();
      setJobs([]);
    } finally {
      setBusyId(null);
      setConfirmClear(false);
    }
  };

  const handleDownload = async (job: JobSummary) => {
    setBusyId(job.id);
    try {
      const full = await getJob(job.id);
      if (!full) {
        setError('That entry could not be found — it may have been removed.');
        return;
      }
      const names = Object.keys(full.stems);
      if (names.length === 0) {
        setError('No saved audio found for this entry.');
        return;
      }
      for (const name of names) {
        const blob = full.stems[name];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${job.fileName.replace(/\.[^.]+$/, '')}-${name}.wav`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // stagger multiple downloads so the browser doesn't block them
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Seo
        title="History — Your past jobs | AI Music Remover"
        description="Review, re-download, or delete your past processing jobs. History is stored only in your browser."
        path="/history"
      />
      <section className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">History</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your past jobs</h1>
        <p className="mt-3 text-muted max-w-2xl">
          Everything here lives only in this browser&apos;s local storage — nothing was ever
          uploaded. Re-download past results while they remain stored, or delete them any time.
        </p>

        {loading && <p className="mt-10 text-muted">Loading history…</p>}
        {error && (
          <p className="mt-10 rounded-xl border border-danger/40 bg-danger/5 text-danger px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="mt-10 rounded-[var(--radius-card)] border border-border bg-surface p-10 text-center">
            <p className="font-semibold mb-2">No jobs yet</p>
            <p className="text-sm text-muted mb-6">
              Process a file with any tool and it can be saved here for later.
            </p>
            <Link
              to="/"
              className="inline-block px-8 py-3 rounded-[var(--radius-btn)] bg-primary text-white font-semibold hover:bg-primary-deep"
            >
              Try the Music Remover
            </Link>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <>
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleClear}
                disabled={busyId === '__clear__'}
                className={`text-sm font-medium px-4 py-2 rounded-full border ${
                  confirmClear
                    ? 'border-danger text-danger'
                    : 'border-border text-muted hover:text-danger hover:border-danger'
                }`}
              >
                {busyId === '__clear__'
                  ? 'Clearing…'
                  : confirmClear
                    ? 'Click again to confirm — delete everything'
                    : 'Clear all history'}
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{job.fileName}</p>
                    <p className="text-sm text-muted mt-1">
                      {job.tool} &middot; {formatDate(job.createdAt)} &middot; {formatDuration(job.durationSec)} of audio
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDownload(job)}
                      disabled={busyId === job.id}
                      className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-deep disabled:opacity-50"
                    >
                      {busyId === job.id ? 'Preparing…' : 'Download stems'}
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={busyId === job.id}
                      className="px-4 py-2 rounded-full border border-border text-sm text-muted hover:text-danger hover:border-danger disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
