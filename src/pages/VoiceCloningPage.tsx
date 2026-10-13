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
      h1="Ethical AI Voice Cloning — Coming Soon"
      sub="Type anything and hear it spoken in a cloned voice — built from the ground up with consent, transparency, and safety at its core. We\u2019re taking the time to do this right: verified consent for every voice, inaudible watermarking on every output, and a strict no-impersonation policy. Join the waitlist for early access."
      badge="Beta / Coming soon"
      widget={<WaitlistWidget />}
      steps={[
        { title: 'Join the waitlist', text: 'Leave your email above. We\u2019ll notify you the moment voice cloning launches — early supporters get extended free-tier access.' },
        { title: 'Verify with consent', text: 'At launch, you\u2019ll record a short voice sample and complete a consent verification proving you own the voice or have the owner\u2019s explicit written permission.' },
        { title: 'Type and generate', text: 'Type any text and hear it spoken in the cloned voice — with natural prosody and emotion, processed on your device. Every output carries an inaudible watermark identifying it as AI-generated.' },
      ]}
      features={[
        { icon: '🛡️', title: 'Consent-first architecture', text: 'No voice can be cloned without verified proof of ownership or the voice owner\u2019s explicit permission. This isn\u2019t a checkbox — it\u2019s a verification flow.' },
        { icon: '🔒', title: 'On-device voice data', text: 'Like every tool on this site, your voice samples never leave your browser. There\u2019s no voiceprint database to breach, sell, or subpoena.' },
        { icon: '💯', title: 'Generous free tier', text: 'We believe creative tools should be accessible. Expect a genuinely useful free tier at launch — not a 30-second teaser designed to upsell you.' },
        { icon: '⚖️', title: 'Ethics by design, not PR', text: 'Inaudible watermarking on all outputs, a strict no-impersonation policy with active enforcement, and no cloning of public figures, period.' },
        { icon: '🎙️', title: 'Natural, expressive quality', text: 'We\u2019re targeting near-human prosody — the rhythm, emphasis, and emotion that make speech sound alive, not robotic. Worth the wait.' },
        { icon: '🌍', title: 'Multiple languages planned', text: 'Voice cloning shouldn\u2019t be English-only. We\u2019re building multilingual support from day one, so creators worldwide can use their own voice.' },
      ]}
      useCases={[
        { title: 'Content creators', text: 'Record voice-overs in your own voice without re-recording every take. Fix a flubbed line, update outdated information, or localize content — all in the voice your audience knows.' },
        { title: 'Accessibility that matters', text: 'For people losing their voice to illness, voice banking preserves the ability to speak in their own voice. This is the use case that motivates us most.' },
        { title: 'Indie games and film', text: 'Small teams can\u2019t afford $500/hour voice actors for every line of dialogue. Ethical voice cloning makes professional-quality character voices accessible to indie creators.' },
        { title: 'Podcast pickups without studio time', text: 'Misspoke a name in episode 47? Instead of booking studio time to re-record one line, generate a seamless pickup in your own cloned voice.' },
      ]}
      faqs={[
        { q: 'When does voice cloning actually launch?', a: 'We\u2019re in active development, and we\u2019d rather ship it right than ship it fast. Voice cloning done wrong enables fraud, misinformation, and non-consensual impersonation — the stakes demand careful engineering of the consent, watermarking, and abuse-prevention systems, not just the voice model itself. Join the waitlist and we\u2019ll email you the moment it\u2019s ready. Early supporters will get extended free-tier access as a thank-you for your patience.' },
        { q: 'Will voice cloning be free?', a: 'Yes — there will be a genuinely generous free tier, consistent with everything else on this site. We\u2019re not building a 30-second demo designed to upsell you to a $30/month plan. The exact limits (minutes per month, number of voices) will be announced at launch, but the philosophy is the same as our other tools: the AI runs on your device, so our costs are low and we pass those savings to you. If you need heavy commercial usage, there may be a paid tier — but the free tier will be useful on its own, not a teaser.' },
        { q: 'Can I clone a celebrity\u2019s voice, or someone else\u2019s?', a: 'No — and this is non-negotiable. Our consent system requires verified proof that you own the voice (it\u2019s you) or have the voice owner\u2019s explicit written permission. There\u2019s no "I promise it\u2019s fine" checkbox; it\u2019s a real verification flow. Cloning public figures, private individuals, or anyone else without their knowledge and consent is impersonation, which can constitute fraud, defamation, or worse depending on jurisdiction. We actively enforce this policy, watermark all outputs as AI-generated, and will never offer celebrity voice cloning. If you want a famous-sounding voice, hire a voice actor who does impressions — that\u2019s a human creative skill worth paying for.' },
        { q: 'Where is my voice data stored, and who can access it?', a: 'On your device only — like every tool on this site. Your voice samples are processed locally in your browser using on-device AI models. There is no voiceprint database on our servers, which means there\u2019s nothing to breach, nothing to sell, and nothing to hand over. This is a deliberate architectural choice: we believe biometric data like voiceprints should never leave your possession. Even we — the site operators — cannot access your voice data, because we never receive it.' },
        { q: 'How will you prevent misuse for fraud and misinformation?', a: 'Through multiple layers: (1) Verified consent before any voice can be cloned, (2) inaudible watermarking embedded in every generated output identifying it as AI-created, (3) a strict no-impersonation policy with active monitoring and enforcement, (4) no cloning of public figures under any circumstances, and (5) rate limits and abuse detection on the generation API. We\u2019re also following emerging industry standards for synthetic media disclosure. No system is perfect, but we\u2019re building the most responsible voice cloning tool we can — and if we can\u2019t do it safely, we won\u2019t ship it.' },
        { q: 'How is this different from the voice effects in your Voice Changer?', a: 'Completely different technology. The Voice Changer applies real-time DSP effects (pitch shifting, robot modulation, reverb) to transform the character of your existing voice — it can\u2019t make you sound like a specific other person. Voice cloning uses AI trained on samples of a target voice to generate entirely new speech in that voice\u2019s likeness, timbre, and speaking style. The Voice Changer is available now and great for fun effects and creative projects. Voice cloning is the more powerful (and more sensitive) technology that we\u2019re building carefully with the safeguards described above.' },
      ]}
    />
  );
}
