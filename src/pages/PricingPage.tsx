import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const TOOLS = [
  'Music Remover — vocals, music & more',
  'Vocal Remover — vocals vs. instrumental',
  'Audio Splitter — 4-stem multitrack',
  'Karaoke Maker — key & tempo control',
  'AI Mashup Maker — blend two songs',
  'Noise Remover — clean recordings',
  'AI Podcast Maker (Beta)',
  'Voice Changer — 6 effects',
  'Audio to Text — Whisper transcription (Beta)',
  'Audio Translator — 10 language pairs (Beta)',
  'Voice Cloning (Coming soon)',
];

export default function PricingPage() {
  return (
    <>
      <Seo
        title="Pricing — Free forever | AI Music Remover"
        description="AI Music Remover is completely free: every tool, unlimited use, no sign-up. See why it costs nothing."
        path="/pricing"
      />
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Pricing</p>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          One plan. It&apos;s free.
        </h1>
        <p className="mt-4 text-muted text-lg max-w-2xl mx-auto">
          No tiers, no trial that expires, no &ldquo;Pro&rdquo; upsell. Every tool on this
          site costs the same thing: nothing.
        </p>

        <div className="mt-10 max-w-xl mx-auto rounded-[var(--radius-card)] border-2 border-primary bg-surface p-8 text-left shadow-[var(--shadow-card)]">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-2xl font-bold">Free forever</h2>
            <p className="text-4xl font-extrabold text-primary">
              $0<span className="text-base font-medium text-muted">/forever</span>
            </p>
          </div>
          <p className="text-sm text-muted mb-6">No account. No credit card. No catch.</p>
          <ul className="space-y-2.5">
            {TOOLS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <span className="text-success font-bold mt-0.5">&#10003;</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">&#10003;</span>
              <span>Unlimited use — process as many files as you like</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">&#10003;</span>
              <span>Private by design — audio never leaves your device</span>
            </p>
          </div>
          <Link
            to="/"
            className="mt-8 block text-center px-8 py-3 rounded-[var(--radius-btn)] bg-primary text-white font-semibold hover:bg-primary-deep"
          >
            Start using the tools
          </Link>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6 text-left">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="text-xl font-bold mb-3">Why is it free?</h2>
            <p className="text-muted text-sm leading-relaxed">
              Most AI audio services rent expensive GPU servers and pass the cost to you.
              AI Music Remover does the opposite: the AI models run entirely in your
              browser, on your device. There are no servers doing the heavy lifting, so
              there is no per-minute cost to cover — and nothing to charge you for.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="text-xl font-bold mb-3">What does it cost you?</h2>
            <p className="text-muted text-sm leading-relaxed">
              Nothing in money. Two honest notes: AI models download once (tens of MB
              each) and are cached for offline reuse, and processing happens on your
              device, so a large file will keep your computer busy for a while. That is
              the whole price list.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
