import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth as FirebaseAuth,
} from 'firebase/auth';

/* ============================================================
   Auth — adapter pattern.
   - FirebaseAuthAdapter: used when VITE_FIREBASE_* env vars are
     present (see .env.example). Drop-in ready for tomorrow.
   - LocalAuthAdapter: TEMPORARY localStorage fallback so the
     sign-in UI is fully testable before Firebase is configured.
     Passwords are SHA-256 hashed (not plaintext); accounts live
     only in this browser. Delete once Firebase is live.
   NOTE: Firebase's free tier does NOT support email OTP codes —
   email/password is the honest $0 option, so that's what we ship.
   (No fake OTP UI anywhere.)
   ============================================================ */

export interface AuthUser {
  email: string;
}

export interface AuthAdapter {
  readonly kind: 'firebase' | 'local';
  onAuthStateChanged(cb: (u: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

/* ---------------- Firebase adapter ---------------- */

class FirebaseAuthAdapter implements AuthAdapter {
  readonly kind = 'firebase' as const;
  private auth: FirebaseAuth;

  constructor() {
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain!,
      projectId: firebaseConfig.projectId!,
      appId: firebaseConfig.appId!,
    });
    this.auth = getAuth(app);
  }

  onAuthStateChanged(cb: (u: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (u) => cb(u?.email ? { email: u.email } : null));
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUp(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }
}

/* ---------------- TEMPORARY local adapter ---------------- */

const LOCAL_USERS_KEY = 'aimr-local-users-v1';
const LOCAL_SESSION_KEY = 'aimr-local-session-v1';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class LocalAuthAdapter implements AuthAdapter {
  readonly kind = 'local' as const;
  private listeners = new Set<(u: AuthUser | null) => void>();
  private user: AuthUser | null = null;

  constructor() {
    try {
      const email = localStorage.getItem(LOCAL_SESSION_KEY);
      if (email) this.user = { email };
    } catch {
      /* storage unavailable */
    }
    console.warn(
      '[auth] Firebase not configured — using TEMPORARY localStorage auth adapter. ' +
        'Add VITE_FIREBASE_* env vars (see .env.example) to switch to Firebase Auth.',
    );
  }

  onAuthStateChanged(cb: (u: AuthUser | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.user);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    this.listeners.forEach((cb) => cb(this.user));
  }

  private readUsers(): Record<string, { hash: string }> {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) ?? '{}') as Record<string, { hash: string }>;
    } catch {
      return {};
    }
  }

  private async hash(email: string, password: string): Promise<string> {
    return sha256(`aimr-local::${email.toLowerCase()}::${password}`);
  }

  async signIn(email: string, password: string): Promise<void> {
    const key = email.trim().toLowerCase();
    const rec = this.readUsers()[key];
    if (!rec || rec.hash !== (await this.hash(key, password))) {
      throw { code: 'auth/invalid-credential' };
    }
    this.user = { email: email.trim() };
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, this.user.email);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  async signUp(email: string, password: string): Promise<void> {
    const key = email.trim().toLowerCase();
    const users = this.readUsers();
    if (users[key]) throw { code: 'auth/email-already-in-use' };
    users[key] = { hash: await this.hash(key, password) };
    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(LOCAL_SESSION_KEY, email.trim());
    } catch {
      /* ignore */
    }
    this.user = { email: email.trim() };
    this.emit();
  }

  async signOut(): Promise<void> {
    this.user = null;
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.emit();
  }
}

/* ---------------- Adapter selection ---------------- */

const adapter: AuthAdapter = isFirebaseConfigured ? new FirebaseAuthAdapter() : new LocalAuthAdapter();

export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong email or password. Try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/* ---------------- React context ---------------- */

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** True when real Firebase credentials are present. */
  configured: boolean;
  /** 'firebase' or 'local' (temporary). */
  authMode: 'firebase' | 'local';
  modalOpen: boolean;
  /** Open the sign-in modal. `after` runs once the user is authenticated. */
  openModal: (after?: () => void) => void;
  closeModal: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Run `action` now if signed in. Otherwise open the sign-in modal
   * and run it after a successful sign-in.
   */
  requireAuth: (action: () => void) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = adapter.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Close the modal on any successful sign-in/sign-up, not just
        // when there's a pending action (fixes stuck "Please wait…" button).
        setModalOpen(false);
        if (pendingAction.current) {
          const run = pendingAction.current;
          pendingAction.current = null;
          // Run after state settles so the gated UI sees the signed-in user.
          setTimeout(run, 0);
        }
      }
    });
    return unsub;
  }, []);

  const openModal = useCallback((after?: () => void) => {
    pendingAction.current = after ?? null;
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    pendingAction.current = null;
    setModalOpen(false);
  }, []);

  const signIn = useCallback((email: string, password: string) => adapter.signIn(email, password), []);
  const signUp = useCallback((email: string, password: string) => adapter.signUp(email, password), []);
  const signOut = useCallback(() => adapter.signOut(), []);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action();
        return;
      }
      openModal(action);
    },
    [user, openModal],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      authMode: adapter.kind,
      modalOpen,
      openModal,
      closeModal,
      signIn,
      signUp,
      signOut,
      requireAuth,
    }),
    [user, loading, modalOpen, openModal, closeModal, signIn, signUp, signOut, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Wrap a process handler so it requires sign-in first. */
export function useRequireAuth(): (action: () => void) => void {
  return useAuth().requireAuth;
}
