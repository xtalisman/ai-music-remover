import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo, { faqJsonLd } from '../components/Seo';
import SeparationWidget from '../components/SeparationWidget';
import ResultPlayer from '../components/ResultPlayer';

/* ============================================================
   Home page — 12 sections, all copy written fresh for this site.
   ============================================================ */

const base = import.meta.env.BASE_URL;

/* ---------- small original inline SVG illustrations ---------- */

function IllustrationWaveform() {
  return (
    <svg viewBox="0 0 120 80" className="w-20 h-14" aria-hidden="true">
      {[18, 30, 44, 58, 72, 86, 100].map((x, i) => (
        <rect key={x} x={x} y={40 - [10, 22, 30, 36, 26, 16, 8][i]} width="7" rx="3.5"
          height={[20, 44, 60, 72, 52, 32, 16][i]} fill={i % 2 ? '#0891B2' : '#4F46E5'} />
      ))}
    </svg>
  );
}

function IllustrationMic() {
  return (
    <svg viewBox="0 0 120 80" className="w-20 h-14" aria-hidden="true">
      <rect x="48" y="6" width="24" height="40" rx="12" fill="#4F46E5" />
      <path d="M36 34a24 24 0 0 0 48 0" stroke="#0891B2" strokeWidth="6" fill="none" strokeLinecap="round" />
      <line x1="60" y1="60" x2="60" y2="72" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationScissors() {
  return (
    <svg viewBox="0 0 120 80" className="w-20 h-14" aria-hidden="true">
      <line x1="14" y1="20" x2="106" y2="20" stroke="#4F46E5" strokeWidth="8" strokeLinecap="round" strokeDasharray="4 10" />
      <circle cx="30" cy="52" r="10" fill="none" stroke="#0891B2" strokeWidth="6" />
      <circle cx="66" cy="52" r="10" fill="none" stroke="#0891B2" strokeWidth="6" />
      <line x1="38" y1="46" x2="88" y2="18" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
      <line x1="58" y1="46" x2="96" y2="64" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationSliders() {
  return (
    <svg viewBox="0 0 120 80" className="w-20 h-14" aria-hidden="true">
      {[22, 60, 98].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="10" x2={x} y2="70" stroke="#e4e6ee" strokeWidth="8" strokeLinecap="round" />
          <circle cx={x} cy={[26, 48, 34][i]} r="10" fill={['#4F46E5', '#0891B2', '#F59E0B'][i]} />
        </g>
      ))}
    </svg>
  );
}

/* ---------- section data ---------- */

const capabilities = [
  {
    illustration: <IllustrationMic />,
    title: 'Lift the voice out of any track',
    text: 'Pull clean vocals out of finished songs so you can study the performance, build a remix, or practice along without the original mix in the way.',
  },
  {
    illustration: <IllustrationWaveform />,
    title: 'Keep the music, drop the talking',
    text: 'Isolate the background music from videos and recordings when you want the soundtrack on its own — intros, outros, and background beds made simple.',
  },
  {
    illustration: <IllustrationScissors />,
    title: 'Cut dialogue free from noise',
    text: 'Separate speech from everything around it so interviews, vlogs, and voice notes sound clear even when they were recorded in a noisy room.',
  },
  {
    illustration: <IllustrationSliders />,
    title: 'Remix your own balance',
    text: 'Blend the separated stems back together with your own levels. Turn the music down under narration, or push the vocals forward for a karaoke-ready mix.',
  },
];

const steps = [
  {
    n: '1',
    title: 'Upload, record, or paste a link',
    text: 'Drop in an MP3, WAV, M4A, or video file — or record straight from your microphone, capture your screen, or import from a direct media link.',
  },
  {
    n: '2',
    title: 'Let the AI separate the stems',
    text: 'An open-source neural network splits your audio into Vocal, Background Music, and Other tracks, right in your browser, with a live progress bar.',
  },
  {
    n: '3',
    title: 'Preview, mix, and download',
    text: 'Listen to every stem in sync, build a custom mix with the volume sliders, then download each track or grab everything as one zip.',
  },
];

const useCases = [
  {
    illustration: <IllustrationWaveform />,
    title: 'Videos that need a music swap',
    text: 'Your edit is locked but the soundtrack has to go — because of a licensing claim, a client request, or a new mood. Strip the old music out and drop in a fresh track without re-shooting a single frame.',
    cta: 'Open the Music Remover',
    to: '/',
  },
  {
    illustration: <IllustrationMic />,
    title: 'Karaoke and practice tracks',
    text: 'Singers and teachers use the vocal track on its own to learn phrasing, or remove the vocals to create backing tracks for rehearsal and live performance.',
    cta: 'Try the Karaoke Maker',
    to: '/karaoke-maker',
  },
  {
    illustration: <IllustrationScissors />,
    title: 'Podcasts and interviews',
    text: 'When room tone, traffic, or background music bleed into your recording, pull the voice forward so your listeners hear every word without the distraction.',
    cta: 'Clean up with Noise Remover',
    to: '/noise-remover',
  },
  {
    illustration: <IllustrationSliders />,
    title: 'Samples and remixes',
    text: 'Producers grab isolated drums, bass, or vocal phrases to chop into new beats. Separate first, then slice the cleanest parts for your sampler.',
    cta: 'Split into 4 stems',
    to: '/audio-splitter',
  },
];

const features = [
  {
    title: '100% free',
    text: 'Every tool, every stem, every download — free with no account, no trial clock, and no watermark. If that ever changes, this page will say so.',
  },
  {
    title: 'Files never leave your device',
    text: 'All AI processing happens locally in your browser. Nothing is uploaded to a server, so your unreleased music and private recordings stay private.',
  },
  {
    title: 'Three clean stems',
    text: 'Every separation returns Vocal, Background Music, and Other — so sound effects and ambience land somewhere useful instead of polluting your mix.',
  },
  {
    title: 'Audio and video in, stems out',
    text: 'Works with songs and with video files. Feed it an MP4 and get a voice-only version back with the original picture untouched.',
  },
  {
    title: 'Honest about limits',
    text: 'Free in-browser AI is powerful but not magic. We tell you the recommended file length, the expected wait, and when a result is still in beta.',
  },
  {
    title: 'No sign-up, no tracking gimmicks',
    text: 'Open the page and start working. Your history lives in your own browser storage — there is nothing to log into and nothing to sell.',
  },
];

const audiences = [
  {
    id: 'creators',
    label: 'YouTubers & Creators',
    text: 'Swap claimed music out of finished videos, pull clean dialogue from noisy vlogs, and make voice-only versions of clips for Shorts and Reels — without re-editing from scratch.',
  },
  {
    id: 'musicians',
    label: 'Musicians & Producers',
    text: 'Study isolated vocal performances, build karaoke backing tracks in a new key, and harvest clean drum and bass stems to chop into your next beat.',
  },
  {
    id: 'podcasters',
    label: 'Podcasters & Interviewers',
    text: 'Rescue interviews recorded in cafés, streets, and echoey rooms. Separate the voice from the world around it and ship episodes that sound like a studio.',
  },
  {
    id: 'educators',
    label: 'Educators & Trainers',
    text: 'Turn lectures and training videos into clean voice tracks for transcripts, captions, and translated versions — then generate the narration for a new language with local text-to-speech.',
  },
  {
    id: 'marketing',
    label: 'Marketing Teams',
    text: 'Localize one video into many languages: strip the original voice track, translate the script, and re-voice it — keeping the background music bed exactly as it was.',
  },
];

const faqs = [
  {
    q: 'Why is it free?',
    a: 'Because there is no server bill to pay. Every tool runs entirely in your browser using open-source AI models, so processing costs us nothing per file — and we pass that on to you. There are no accounts, no trials, and no upsells hidden behind the download button.',
  },
  {
    q: 'Does it work offline after the first load?',
    a: 'Mostly, yes. The AI models download the first time you open a tool and are then cached in your browser. After that, separation and most other tools keep working without an internet connection — only features that fetch a media link need to be online.',
  },
  {
    q: 'Why is the first run slower?',
    a: 'The first time you use a tool, your browser downloads the AI model (tens of megabytes) and prepares it for your device. Later runs skip that step entirely and go straight to processing, so they start in seconds.',
  },
  {
    q: 'What devices do I need?',
    a: 'Any reasonably modern laptop or desktop with a current version of Chrome, Edge, Safari, or Firefox, and at least 4 GB of free memory. Devices with WebGPU support process noticeably faster; on weaker hardware the app warns you and offers a lighter, faster mode.',
  },
  {
    q: 'Which file formats are supported?',
    a: 'Audio: MP3, WAV, M4A, and most other common formats. Video: MP4, MOV, AVI, and 3GP. Your browser converts everything to a working format automatically before the AI sees it.',
  },
  {
    q: 'How long can my files be?',
    a: 'We recommend up to 10 minutes for stem separation — longer files work but take proportionally more time and memory. The app shows a friendly warning above that length so you can decide before you wait.',
  },
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. All processing happens locally on your device; your files never leave your browser tab. That is also why the tools keep working offline once the models are cached.',
  },
  {
    q: 'What do the three stems mean?',
    a: 'Vocal holds the singing or speaking voice. Background Music holds the instrumental backing. Other catches everything else — sound effects, ambience, and crowd noise — so it does not leak into the two stems you care about most.',
  },
  {
    q: 'Can I remove background music from a video?',
    a: 'Yes. Upload the video file and the app extracts its audio, separates the stems, and can export a voice-only version with your original picture re-attached — handy for re-scoring edits or fixing licensed-music problems.',
  },
  {
    q: 'Does it work on phones?',
    a: 'Yes, the site is fully usable on mobile browsers, but phones have less memory and slower chips, so we recommend shorter files and the faster processing mode on mobile.',
  },
  {
    q: 'Can I use the separated tracks commercially?',
    a: 'That depends on the rights to the original recording, not on our tools. Only process content you own or have permission to use, and check the license of any song before publishing a remix or re-upload.',
  },
  {
    q: 'How good is the separation quality?',
    a: 'Very good on typical mixed music and clear speech; trickier on dense mixes, heavy effects, or very low-quality recordings. If a result is not clean enough, try the faster mode for a quick check before committing to the full-quality pass.',
  },
];

interface StatItem { value: string; label: string }
interface TestimonialItem { name: string; role: string; quote: string }

export default function HomePage() {
  const [stats, setStats] = useState<StatItem[] | null>(null);
  const [testimonials, setTestimonials] = useState<TestimonialItem[] | null>(null);
  const [audience, setAudience] = useState(audiences[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch(`${base}data/stats.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStats(Array.isArray(d) ? d : []))
      .catch(() => setStats([]));
    fetch(`${base}data/testimonials.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTestimonials(Array.isArray(d) ? d : []))
      .catch(() => setTestimonials([]));
  }, []);

  const activeAudience = audiences.find((a) => a.id === audience) ?? audiences[0];
  const showStats = stats !== null && stats.length > 0;
  const showTestimonials = testimonials !== null && testimonials.length > 0;

  return (
    <div>
      <Seo
        title="AI Music Remover — Remove Background Music & Vocals Free, In Your Browser"
        description="Remove background music from any song or video free. AI splits audio into Vocal, Background Music, and Other stems entirely in your browser — no upload, no sign-up."
        path="/"
        jsonLd={faqJsonLd(faqs)}
      />

      {/* ============ 1. HERO ============ */}
      <section className="px-4 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-surface border border-border text-sm font-medium text-primary mb-6">
            Free AI stem separation — no sign-up
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Remove Background Music from <span className="text-primary">Any Song or Video</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-muted max-w-2xl mx-auto">
            Our free AI splits your audio into Vocal, Background Music, and Other tracks —
            entirely in your browser. Your files never leave your device.
          </p>
        </div>
        <div className="max-w-4xl mx-auto mt-10">
          <SeparationWidget />
          <p className="mt-4 text-center text-sm text-muted">
            Please only process content you own or have the rights to use.
          </p>
        </div>
      </section>

      {/* ============ 2. DEMO PLAYER ============ */}
      <section className="px-4 py-12 md:py-16 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            Hear what the AI can pull apart
          </h2>
          <p className="mt-3 text-muted text-center max-w-2xl mx-auto">
            A short original demo, separated into stems right here on this page.
            Switch tabs to compare each track against the full mix.
          </p>
          <div className="mt-8">
            <ResultPlayer
              tracks={[
                { id: 'original', label: 'Original', url: `${base}samples/demo-original.wav` },
                { id: 'vocals', label: 'Vocal', url: `${base}samples/demo-vocals.wav` },
                { id: 'music', label: 'Background Music', url: `${base}samples/demo-music.wav` },
                { id: 'other', label: 'Other', url: `${base}samples/demo-other.wav` },
                { id: 'custom', label: 'Custom Mix', url: `${base}samples/demo-custom.wav` },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ============ 3. WHAT YOU CAN DO ============ */}
      <section className="px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            What you can do with your tracks
          </h2>
          <p className="mt-3 text-muted text-center max-w-2xl mx-auto">
            Three stems open up more than muting the music. Here is where most people start.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] flex flex-col items-center text-center"
              >
                <div className="mb-4">{c.illustration}</div>
                <h3 className="font-bold text-lg">{c.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 4. TRUST BAR (auto-hides when empty) ============ */}
      {showStats && (
        <section className="px-4 pb-12 md:pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats!.map((s, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center"
                >
                  <div className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</div>
                  <div className="mt-1 text-sm text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 5. HOW IT WORKS ============ */}
      <section className="px-4 py-12 md:py-20 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            From file to stems in three steps
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-[var(--radius-card)] border border-border bg-background p-8 shadow-[var(--shadow-card)]"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white grid place-items-center text-xl font-extrabold">
                  {s.n}
                </div>
                <h3 className="mt-5 font-bold text-xl">{s.title}</h3>
                <p className="mt-2 text-muted leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 6. USE CASES ============ */}
      <section className="px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            Made for real projects
          </h2>
          <p className="mt-3 text-muted text-center max-w-2xl mx-auto">
            Different jobs, same three stems. Pick the one that sounds like yours.
          </p>
          <div className="mt-12 space-y-12 md:space-y-16">
            {useCases.map((u, i) => (
              <div
                key={u.title}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-14 ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className="w-full md:w-1/2 rounded-[var(--radius-card)] border border-border bg-surface p-10 grid place-items-center">
                  <div className="scale-150">{u.illustration}</div>
                </div>
                <div className="w-full md:w-1/2">
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{u.title}</h3>
                  <p className="mt-3 text-muted leading-relaxed">{u.text}</p>
                  <Link
                    to={u.to}
                    className="inline-block mt-5 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-[var(--color-primary-deep)] transition-colors"
                  >
                    {u.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 7. WHY CHOOSE US ============ */}
      <section className="px-4 py-12 md:py-20 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            Why people stick with AI Music Remover
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[var(--radius-card)] border border-border bg-background p-6 shadow-[var(--shadow-card)]"
              >
                <div className="w-9 h-9 rounded-full bg-accent grid place-items-center font-bold text-[var(--color-accent-text)]">
                  ✓
                </div>
                <h3 className="mt-4 font-bold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 8. MID-PAGE CTA ============ */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto rounded-[var(--radius-card)] bg-accent px-8 py-12 md:py-16 text-center shadow-[var(--shadow-card)]">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-accent-text)]">
            Your next mix is one upload away
          </h2>
          <p className="mt-3 text-[var(--color-accent-text)] opacity-80 max-w-xl mx-auto">
            No account, no cost, no waiting room. Drop in a song or video and hear the stems in minutes.
          </p>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-block mt-7 px-8 py-4 rounded-full bg-[var(--color-accent-text)] text-white font-bold hover:opacity-90 transition-opacity"
          >
            Separate a track now
          </a>
        </div>
      </section>

      {/* ============ 9. WHO USES IT ============ */}
      <section className="px-4 py-12 md:py-20 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Who uses it</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Audiences">
            {audiences.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={audience === a.id}
                onClick={() => setAudience(a.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  audience === a.id
                    ? 'bg-primary text-white'
                    : 'bg-background border border-border hover:border-primary'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-background p-8 md:p-10 shadow-[var(--shadow-card)]">
            <h3 className="text-xl md:text-2xl font-bold">{activeAudience.label}</h3>
            <p className="mt-3 text-muted leading-relaxed max-w-2xl mx-auto">{activeAudience.text}</p>
          </div>
        </div>
      </section>

      {/* ============ 10. TESTIMONIALS (auto-hides when empty) ============ */}
      {showTestimonials && (
        <section className="px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
              What users say
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials!.map((t, i) => (
                <figure
                  key={i}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] flex flex-col"
                >
                  <blockquote className="text-muted leading-relaxed flex-1">“{t.quote}”</blockquote>
                  <figcaption className="mt-5">
                    <div className="font-bold">{t.name}</div>
                    <div className="text-sm text-muted">{t.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 11. FAQ ============ */}
      <section className="px-4 py-12 md:py-20 bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-[var(--radius-card)] border border-border bg-background overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left font-semibold"
                  >
                    <span>{f.q}</span>
                    <span className={`text-primary text-xl transition-transform ${open ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                  {open && <p className="px-6 pb-5 text-muted leading-relaxed">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 12. FINAL CTA ============ */}
      <section className="px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Ready to hear your music <span className="text-primary">in pieces?</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Free forever, private by design, and already loaded in your browser.
          </p>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-block mt-8 px-10 py-4 rounded-full bg-accent text-[var(--color-accent-text)] font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Start separating — it&apos;s free
          </a>
        </div>
      </section>
    </div>
  );
}
