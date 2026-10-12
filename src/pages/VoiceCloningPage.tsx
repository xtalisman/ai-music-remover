import { useState } from 'react';
import ToolPage from '../components/ToolPage';

function WaitlistWidget() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!consent) { setError('Please confirm the consent checkbox first.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    // Free static-form endpoint (Formspree). Replace the ID below with your own form ID.
    try {
      const res = await fetch('https://formspree.io/f/your-form-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, interest: 'voice-cloning-waitlist' }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      // Honest fallback: the demo endpoint isn't configured yet.
      setError('Waitlist signup isn\u2019t connected yet — check back soon.');
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-bold text-lg mb-2">You’re on the list!</h3>
        <p className="text-sm text-muted">We’ll email you the moment voice cloning launches.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
      <div className="text-center mb-6">
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-accent text-[var(--color-accent-text)] mb-3">
          COMING SOON
        </span>
        <h3 className="font-bold text-xl">Get notified at launch</h3>
        <p className="text-sm text-muted mt-2">
          We’re building ethical, consent-based voice cloning that runs in your browser.
          Join the waitlist for early access.
        </p>
      </div>
      <form onSubmit={submit}>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-full border border-border bg-background mb-3"
        />
        <label className="flex items-start gap-2 text-xs text-muted mb-4">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-[var(--color-primary)]" />
          I understand voice cloning will require my explicit consent and a voice sample I own the
          rights to, and I agree to be emailed about the launch.
        </label>
        {error && <p className="text-sm text-danger mb-3">{error}</p>}
        <button type="submit" className="w-full py-3 rounded-full bg-primary text-white font-bold">
          Notify me
        </button>
      </form>
      <div className="mt-6 text-xs text-muted space-y-2">
        <p><strong>How it will work:</strong> record a short consented voice sample → our model learns
          the voice → type any text to hear it spoken. All on-device.</p>
        <p><strong>Our ethics pledge:</strong> no cloning without explicit consent from the voice owner,
          watermarked outputs, and abuse reporting. We will never offer impersonation of real people
          without their permission.</p>
      </div>
    </div>
  );
}

export default function VoiceCloningPage() {
  return (
    <ToolPage
      path="/voice-cloning"
      seoTitle="Voice Cloning — Coming Soon | AI Music Remover"
      seoDescription="Ethical, consent-based AI voice cloning is coming to AI Music Remover. Join the waitlist for early access."
      h1="Voice cloning is coming"
      sub="Type anything and hear it in a cloned voice — built ethically, with consent at the core."
      badge="Beta / Coming soon"
      widget={<WaitlistWidget />}
      steps={[
        { title: 'Join the waitlist', text: 'Leave your email above for early access.' },
        { title: 'Record with consent', text: 'At launch, you\u2019ll provide a short voice sample you own the rights to.' },
        { title: 'Type & generate', text: 'Type any text and hear it spoken in the cloned voice — on your device.' },
      ]}
      features={[
        { icon: '🛡️', title: 'Consent-first', text: 'Explicit consent flows and verification before any voice can be cloned.' },
        { icon: '🔒', title: 'On-device', text: 'Like all our tools, voice data never leaves your browser.' },
        { icon: '💯', title: 'Free tier', text: 'Generous free cloning at launch.' },
        { icon: '⚖️', title: 'Ethics by design', text: 'Watermarked outputs and a strict no-impersonation policy.' },
        { icon: '🎙️', title: 'Natural quality', text: 'We\u2019re targeting near-human prosody and emotion.' },
        { icon: '🌍', title: 'Multiple languages', text: 'Planned language support from day one.' },
      ]}
      useCases={[
        { title: 'Content creators', text: 'Voice-overs in your own voice without re-recording.' },
        { title: 'Accessibility', text: 'Give a voice back to those who\u2019ve lost theirs.' },
        { title: 'Indie games & film', text: 'Affordable character voices for small teams.' },
        { title: 'Podcasts', text: 'Fix flubbed lines without booking studio time.' },
      ]}
      faqs={[
        { q: 'When does voice cloning launch?', a: 'We\u2019re in active development. Join the waitlist and we\u2019ll email you the moment it\u2019s ready.' },
        { q: 'Will it be free?', a: 'There will be a generous free tier. Details at launch.' },
        { q: 'Can I clone a celebrity\u2019s voice?', a: 'No. Our consent system requires proof you own the rights to the voice or have the owner\u2019s explicit permission.' },
        { q: 'Where is my voice data stored?', a: 'On your device only — like every tool on this site.' },
      ]}
    />
  );
}
