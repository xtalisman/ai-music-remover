import { useEffect, useState } from 'react';
import { useAuth, friendlyAuthError } from '../lib/auth';

/* ============================================================
   Sign-in modal — email/password only.
   (Firebase free tier has no email OTP; Google sign-in skipped
   for now. Email/password is the honest $0 option.)
   ============================================================ */

export default function AuthModal() {
  const { modalOpen, closeModal, signIn, signUp, authMode } = useAuth();
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (modalOpen) {
      setError('');
      setBusy(false);
    }
  }, [modalOpen, tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (modalOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  if (!modalOpen) return null;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPassword = password.length >= 6;

  const submit = async () => {
    if (!validEmail || !validPassword || busy) return;
    setBusy(true);
    setError('');
    try {
      if (tab === 'in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      // onAuthStateChanged closes the modal + runs any pending action.
    } catch (e) {
      setError(friendlyAuthError((e as { code?: string }).code ?? ''));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-card)] bg-background border border-border shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-8 h-8 rounded-xl" />
          <span className="font-bold">AI Music Remover</span>
        </div>
        <h2 className="text-xl font-extrabold mt-3">
          {tab === 'in' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-sm text-muted mt-1 mb-5">
          Sign in to process audio files. Free forever.
        </p>

        {authMode === 'local' && (
          <div className="mb-4 text-xs rounded-xl bg-warning/10 text-warning px-3 py-2">
            Demo mode — accounts are stored only in this browser until the site owner connects Firebase.
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface mb-5">
          {(['in', 'up'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 rounded-full text-sm font-semibold transition ${
                tab === t ? 'bg-background shadow text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {t === 'in' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium mb-1" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mb-3"
        />
        <label className="block text-sm font-medium mb-1" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={tab === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tab === 'in' ? 'Your password' : 'At least 6 characters'}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
        {tab === 'up' && password.length > 0 && password.length < 6 && (
          <p className="text-xs text-warning mt-1">Password must be at least 6 characters.</p>
        )}

        {error && (
          <p className="text-sm text-danger mt-3 rounded-xl bg-danger/10 px-3 py-2">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={!validEmail || !validPassword || busy}
          className="w-full mt-4 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? 'Please wait…' : tab === 'in' ? 'Sign In' : 'Create Account'}
        </button>

        <p className="text-xs text-muted text-center mt-4">
          Your files never leave your device — we only use sign-in to prevent abuse.
        </p>
      </div>
    </div>
  );
}
