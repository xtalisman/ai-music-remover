import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const TOOLS = [
  { path: '/', label: 'Music Remover', desc: 'Split vocals, music & more' },
  { path: '/vocal-remover', label: 'Vocal Remover', desc: 'Vocals vs instrumental' },
  { path: '/audio-splitter', label: 'Audio Splitter', desc: '4-stem multitrack split' },
  { path: '/karaoke-maker', label: 'Karaoke Maker', desc: 'Instrumentals + key/tempo' },
  { path: '/ai-mashup-maker', label: 'AI Mashup Maker', desc: 'Blend two songs' },
  { path: '/noise-remover', label: 'Noise Remover', desc: 'Clean up recordings' },
  { path: '/ai-podcast-maker', label: 'AI Podcast Maker', desc: 'Script-to-speech shows', badge: 'Beta' },
  { path: '/voice-changer', label: 'Voice Changer', desc: '6 fun voice effects' },
  { path: '/ai-audio-to-text', label: 'Audio to Text', desc: 'Whisper transcription', badge: 'Beta' },
  { path: '/ai-audio-translator', label: 'Audio Translator', desc: '10 language pairs', badge: 'Beta' },
  { path: '/voice-cloning', label: 'Voice Cloning', desc: 'Custom voices', badge: 'Soon' },
];

export default function SiteHeader() {
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setDropOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="AI Music Remover logo" className="w-8 h-8 rounded-xl" />
          <span className="hidden sm:inline">AI Music Remover</span>
          <span className="sm:hidden">AMR</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm">
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-primary font-medium"
              aria-expanded={dropOpen}
            >
              AI Tools <span className={`text-xs transition-transform ${dropOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {dropOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl border border-border bg-background shadow-xl p-2 grid gap-1">
                {TOOLS.map((t) => (
                  <Link key={t.path} to={t.path} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface">
                    <span>
                      <span className="block font-medium text-sm">{t.label}</span>
                      <span className="block text-xs text-muted">{t.desc}</span>
                    </span>
                    {t.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-dark">
                        {t.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/blog" className="hover:text-primary">Blog</Link>
          <Link to="/pricing" className="hover:text-primary">Pricing</Link>
          <Link to="/history" className="hover:text-primary">History</Link>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-[var(--color-accent-text)]">
            100% Free
          </span>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-surface"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="lg:hidden border-t border-border bg-background px-4 py-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">AI Tools</p>
          <div className="grid gap-1 mb-4">
            {TOOLS.map((t) => (
              <Link key={t.path} to={t.path} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface">
                <span className="font-medium text-sm">{t.label}</span>
                {t.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-dark">
                    {t.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="flex gap-4 text-sm font-medium border-t border-border pt-3">
            <Link to="/blog" className="hover:text-primary">Blog</Link>
            <Link to="/pricing" className="hover:text-primary">Pricing</Link>
            <Link to="/history" className="hover:text-primary">History</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
