import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../../components/Seo';

interface PostLayoutProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  children: ReactNode;
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  ctaHref: string;
}

/** Shared shell for blog articles: SEO, header, body, CTA, back-link. */
export default function PostLayout(p: PostLayoutProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: p.description,
    datePublished: '2026-10-13',
    author: { '@type': 'Organization', name: 'AI Music Remover' },
  };
  return (
    <>
      <Seo title={`${p.title} | AI Music Remover Blog`} description={p.description} path={`/blog/${p.slug}`} jsonLd={jsonLd} />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/blog" className="text-sm text-primary font-medium hover:underline">
          &larr; All articles
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4">{p.title}</h1>
        <p className="text-sm text-muted mt-3">
          {p.date} &middot; {p.readTime} read
        </p>
        <div className="mt-8 space-y-6 text-[1.05rem] leading-relaxed post-body">
          {p.children}
        </div>
        <div className="mt-12 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{p.ctaTitle}</h2>
          <p className="text-muted mb-5">{p.ctaText}</p>
          <Link
            to={p.ctaHref}
            className="inline-block px-8 py-3 rounded-[var(--radius-btn)] bg-primary text-white font-semibold hover:bg-primary-deep"
          >
            {p.ctaLabel}
          </Link>
        </div>
      </article>
    </>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-bold pt-4">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-ink/90">{children}</p>;
}
