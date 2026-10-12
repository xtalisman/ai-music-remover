import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo, { faqJsonLd } from './Seo';

export interface ToolStep { title: string; text: string; }
export interface ToolCard { title: string; text: string; icon?: string; }
export interface ToolFaq { q: string; a: string; }

interface ToolPageProps {
  path: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  sub: string;
  badge?: string;
  widget: ReactNode;
  steps: ToolStep[];
  features: ToolCard[];
  useCases: { title: string; text: string; cta?: string; ctaHref?: string }[];
  faqs: ToolFaq[];
}

/** Reusable template for every tool page: hero + widget, how-it-works,
    features, use cases, FAQ (with JSON-LD), final CTA. */
export default function ToolPage(p: ToolPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <>
      <Seo
        title={p.seoTitle}
        description={p.seoDescription}
        path={p.path}
        jsonLd={faqJsonLd(p.faqs)}
      />

      {/* Hero + widget */}
      <section className="max-w-7xl mx-auto px-4 pt-12 pb-8 text-center">
        {p.badge && (
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
            {p.badge}
          </span>
        )}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">{p.h1}</h1>
        <p className="mt-4 text-muted text-lg max-w-2xl mx-auto">{p.sub}</p>
        <div className="mt-8">{p.widget}</div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {p.steps.map((s, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <div className="w-10 h-10 rounded-full bg-primary text-white grid place-items-center font-bold mb-4">
                {i + 1}
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Why use this tool</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {p.features.map((f, i) => (
              <div key={i} className="rounded-[var(--radius-card)] bg-background border border-border p-6 shadow-[var(--shadow-card)]">
                {f.icon && <div className="text-2xl mb-3">{f.icon}</div>}
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What you can do with it</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {p.useCases.map((u, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-border p-6">
              <h3 className="font-bold mb-2">{u.title}</h3>
              <p className="text-sm text-muted mb-3">{u.text}</p>
              {u.cta && u.ctaHref && (
                <Link to={u.ctaHref} className="text-sm font-semibold text-primary hover:underline">
                  {u.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-3">
          {p.faqs.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 font-semibold flex justify-between items-center gap-4"
              >
                {f.q}
                <span className="text-primary text-xl shrink-0">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="px-5 pb-5 text-sm text-muted">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-4">
        <div className="rounded-[var(--radius-card)] bg-primary text-white text-center px-6 py-12 shadow-[var(--shadow-card)]">
          <h2 className="text-2xl md:text-3xl font-bold">Try it free — right in your browser</h2>
          <p className="mt-3 text-white/80">No sign-up. No uploads. Your files never leave your device.</p>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="inline-block mt-6 px-8 py-3 rounded-full bg-accent text-[var(--color-accent-text)] font-bold">
            Start now
          </a>
        </div>
      </section>
    </>
  );
}
