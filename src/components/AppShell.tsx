import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import AuthModal from './AuthModal';

/* ============================================================
   AppShell — premium sidebar + header layout.
   All icons below are original inline SVG designs.
   ============================================================ */

const logoBase = import.meta.env.BASE_URL;

/* ---------------- Original icons (24×24, stroke) ---------------- */

type IconProps = { className?: string };

function Svg({ className = 'w-5 h-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 11.5 12 4l8 7.5" /><path d="M6.5 10v9.5h11V10" /><path d="M10 19.5v-5h4v5" /></Svg>
);
const MicIcon = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3.5" /><path d="M8.5 21.5h7" /></Svg>
);
const SplitIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h7" /><path d="M11 12l9-6.5" /><path d="M11 12l9 6.5" /><circle cx="4" cy="12" r="1.6" /><circle cx="20" cy="5.5" r="1.6" /><circle cx="20" cy="18.5" r="1.6" /></Svg>
);
const WaveIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 10v4" /><path d="M8 7v10" /><path d="M12 4v16" /><path d="M16 8v8" /><path d="M20 10.5v3" /></Svg>
);
const PodcastIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><path d="M8.5 15.5a5 5 0 0 1 0-7" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M6 18a8.6 8.6 0 0 1 0-12" /><path d="M18 6a8.6 8.6 0 0 1 0 12" /></Svg>
);
const NoteIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 18.5V6l10-2.5V16" /><circle cx="6.8" cy="18.5" r="2.4" /><circle cx="16.8" cy="16" r="2.4" /></Svg>
);
const ShuffleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h4l12 10" /><path d="M4 17h4l3.5-3.5" /><path d="M13.5 10.5 16 7h4" /><path d="M17.5 4.5 20 7l-2.5 2.5" /><path d="M17.5 14.5 20 17l-2.5 2.5" /></Svg>
);
const DocTextIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 3.5h8L19 8.5V20.5H6z" /><path d="M14 3.5V8.5h5" /><path d="M9 12.5h6" /><path d="M9 16h6" /></Svg>
);
const GlobeIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c-5.2 5.1-5.2 11.9 0 17" /><path d="M12 3.5c5.2 5.1 5.2 11.9 0 17" /></Svg>
);
const SlidersIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4v16" /><path d="M12 4v16" /><path d="M19 4v16" /><circle cx="5" cy="14" r="2.2" fill="var(--color-background)" /><circle cx="12" cy="8" r="2.2" fill="var(--color-background)" /><circle cx="19" cy="16" r="2.2" fill="var(--color-background)" /></Svg>
);
const CloneIcon = (p: IconProps) => (
  <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 4.5H6.5A2 2 0 0 0 4.5 6.5V16" /></Svg>
);
const HistoryIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3" /><path d="M4.5 12H2.8" /><path d="M4.5 12l-1.9 2" /><path d="M12 7.5V12l3 2" /></Svg>
);
const ChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="m6 9.5 6 6 6-6" /></Svg>
);
const ChevronLeft = (p: IconProps) => (
  <Svg {...p}><path d="M14.5 6 8.5 12l6 6" /></Svg>
);
const ChevronRight = (p: IconProps) => (
  <Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>
);
const MenuIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>
);
const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
);
const CrownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 17.5h16" /><path d="M4 17.5 3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1 9.5" /></Svg>
);

function XSocialIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.7 3H21l-7.1 8.1L22.2 21h-6.6l-5.1-6.1L4.6 21H1.3l7.6-8.7L1.8 3h6.7l4.6 5.6L17.7 3zm-1.2 16h1.8L7.1 4.9H5.2L16.5 19z" />
    </svg>
  );
}
function YoutubeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12.5" rx="3.5" />
      <path d="M10.5 9.8v4.9l4.5-2.45z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function InstagramIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------------- Nav data ---------------- */

interface ToolItem { path: string; label: string; icon: (p: IconProps) => JSX.Element; badge?: string }

const TOOLS: ToolItem[] = [
  { path: '/', label: 'Music Remover', icon: HomeIcon },
  { path: '/vocal-remover', label: 'Vocal Remover', icon: MicIcon },
  { path: '/audio-splitter', label: 'Audio Splitter', icon: SplitIcon },
  { path: '/noise-remover', label: 'Noise Remover', icon: WaveIcon },
  { path: '/ai-podcast-maker', label: 'AI Podcast Maker', icon: PodcastIcon, badge: 'Beta' },
  { path: '/karaoke-maker', label: 'Karaoke Maker', icon: NoteIcon },
  { path: '/ai-mashup-maker', label: 'AI Mashup Maker', icon: ShuffleIcon },
  { path: '/ai-audio-to-text', label: 'AI Audio to Text', icon: DocTextIcon, badge: 'Beta' },
  { path: '/ai-audio-translator', label: 'AI Audio Translator', icon: GlobeIcon, badge: 'Beta' },
  { path: '/voice-changer', label: 'Voice Changer', icon: SlidersIcon },
  { path: '/voice-cloning', label: 'Voice Cloning', icon: CloneIcon, badge: 'Soon' },
];

interface HeaderNavEntry {
  label: string;
  path?: string;
  children?: { label: string; path: string; badge?: string }[];
}

const HEADER_NAV: HeaderNavEntry[] = [
  { label: 'Vocal Remover', path: '/vocal-remover' },
  { label: 'Audio Splitter', path: '/audio-splitter' },
  {
    label: 'Noise Remover',
    children: [
      { label: 'Noise Remover', path: '/noise-remover' },
      { label: 'Voice Changer', path: '/voice-changer' },
    ],
  },
  {
    label: 'Podcast Maker',
    children: [{ label: 'AI Podcast Maker', path: '/ai-podcast-maker', badge: 'Beta' }],
  },
  {
    label: 'AI Tools',
    children: [
      { label: 'Karaoke Maker', path: '/karaoke-maker' },
      { label: 'AI Mashup Maker', path: '/ai-mashup-maker' },
      { label: 'AI Audio to Text', path: '/ai-audio-to-text', badge: 'Beta' },
      { label: 'AI Audio Translator', path: '/ai-audio-translator', badge: 'Beta' },
      { label: 'Voice Cloning', path: '/voice-cloning', badge: 'Soon' },
    ],
  },
  { label: 'Blog', path: '/blog' },
];

function Badge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-warning shrink-0">
      {label}
    </span>
  );
}

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/* ---------------- Sidebar ---------------- */

function SideNavItem({ item, collapsed }: { item: ToolItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-ink/75 hover:bg-surface hover:text-ink'
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge && <Badge label={item.badge} />}
    </NavLink>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link
        to="/"
        onClick={onNavigate}
        className={`flex items-center gap-2 h-16 px-4 border-b border-border shrink-0 ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <img src={`${logoBase}logo-icon.webp`} alt="AI Music Remover logo" className="w-8 h-8 rounded-xl shrink-0" />
        {!collapsed && <span className="font-bold text-[15px] whitespace-nowrap">AI Music Remover</span>}
      </Link>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'px-2.5' : 'px-3'}`} aria-label="Tools">
        {TOOLS.map((t) => (
          <div key={t.path} onClick={onNavigate}>
            <SideNavItem item={t} collapsed={collapsed} />
          </div>
        ))}
        <div className={`my-3 border-t border-border ${collapsed ? 'mx-1' : 'mx-1'}`} />
        <div onClick={onNavigate}>
          <SideNavItem
            item={{ path: '/history', label: 'History', icon: HistoryIcon }}
            collapsed={collapsed}
          />
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 shrink-0">
        <Link
          to="/pricing"
          onClick={onNavigate}
          title={collapsed ? 'Upgrade' : undefined}
          className={`flex items-center justify-center gap-2 rounded-full bg-accent text-[var(--color-accent-text)] font-bold text-sm py-2.5 hover:brightness-95 transition ${
            collapsed ? 'px-0' : 'px-4'
          }`}
        >
          <CrownIcon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Upgrade</span>}
        </Link>
        {!collapsed && (
          <div className="mt-3">
            <div className="flex items-center gap-3 text-muted px-1">
              <a href="#" aria-label="X" className="hover:text-ink transition"><XSocialIcon /></a>
              <a href="#" aria-label="YouTube" className="hover:text-ink transition"><YoutubeIcon /></a>
              <a href="#" aria-label="Instagram" className="hover:text-ink transition"><InstagramIcon /></a>
            </div>
            <div className="flex items-center gap-2 mt-3 px-1 text-xs text-muted">
              <Link to="/privacy" onClick={onNavigate} className="hover:text-primary">Privacy Policy</Link>
              <span className="text-border">|</span>
              <Link to="/terms" onClick={onNavigate} className="hover:text-primary">Terms &amp; Conditions</Link>
            </div>
            <p className="mt-2 px-1 text-xs text-muted">© AI Music Remover 2026</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */

function HeaderDropdown({ entry }: { entry: HeaderNavEntry }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const activeChild = entry.children?.some((c) => c.path === location.pathname);

  return (
    <div
      className="relative"
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 py-2 text-sm font-medium transition-colors ${
          activeChild ? 'text-primary' : 'hover:text-primary'
        }`}
      >
        {entry.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-2xl border border-border bg-background shadow-xl p-2 grid gap-0.5 z-50">
          {entry.children!.map((c) => (
            <Link
              key={c.path}
              to={c.path}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface text-sm"
            >
              <span className="font-medium">{c.label}</span>
              {c.badge && <Badge label={c.badge} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const initial = (user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div
      className="relative"
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-bold text-sm hover:bg-primary-deep transition"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl border border-border bg-background shadow-xl p-2 z-50">
          <p className="px-3 py-2 text-sm text-muted truncate">{user?.email}</p>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- AppShell ---------------- */

const COLLAPSE_KEY = 'aimr-sidebar-collapsed';

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, openModal } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const contentPad = collapsed ? 'lg:pl-[76px]' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-[width] duration-200 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <SidebarBody collapsed={collapsed} />
        {/* Collapse arrow at the sidebar edge */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-24 w-7 h-7 rounded-full bg-background border border-border shadow grid place-items-center text-muted hover:text-primary hover:border-primary transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-border shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 w-8 h-8 grid place-items-center rounded-full text-muted hover:bg-surface hover:text-ink z-10"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={`transition-[padding] duration-200 ${contentPad}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/90 backdrop-blur border-b border-border">
          <div className="h-full px-4 flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon className="w-6 h-6" />
            </button>

            <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
              {HEADER_NAV.map((entry) =>
                entry.path ? (
                  <Link
                    key={entry.label}
                    to={entry.path}
                    className="py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {entry.label}
                  </Link>
                ) : (
                  <HeaderDropdown key={entry.label} entry={entry} />
                ),
              )}
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link
                to="/history"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary transition-colors"
              >
                <HistoryIcon className="w-4 h-4" />
                History
              </Link>
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => openModal()}
                  className="text-sm font-semibold px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary transition"
                >
                  Sign In
                </button>
              )}
              <Link
                to="/pricing"
                className="text-sm font-bold px-4 py-2 rounded-full bg-accent text-[var(--color-accent-text)] hover:brightness-95 transition"
              >
                Upgrade
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>

        {/* Slim footer (replaces the old big footer) */}
        <footer className="border-t border-border mt-16">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted">
            <span>© AI Music Remover 2026 · All processing happens in your browser</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary">Terms &amp; Conditions</Link>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal />
    </div>
  );
}
