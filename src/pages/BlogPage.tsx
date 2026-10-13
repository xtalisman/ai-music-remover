import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tag: string;
}

export const BLOG_POSTS: PostMeta[] = [
  {
    slug: 'how-ai-stem-separation-works',
    title: 'How AI Stem Separation Actually Works',
    excerpt:
      'Spectrograms, masks, and neural networks: a beginner-friendly tour of the technology that pulls vocals out of a finished song.',
    date: 'October 13, 2026',
    readTime: '7 min',
    tag: 'Technology',
  },
  {
    slug: 'make-karaoke-track-at-home',
    title: 'How to Make a Karaoke Track at Home (The Practical Guide)',
    excerpt:
      'From source quality to key changes: a step-by-step workflow for turning any song into a singable backing track.',
    date: 'October 13, 2026',
    readTime: '6 min',
    tag: 'Guides',
  },
  {
    slug: 'clean-noisy-recordings',
    title: 'How to Clean Up a Noisy Voice Recording',
    excerpt:
      'Mic technique, noise profiles, spectral gating — and an honest guide to when re-recording beats processing.',
    date: 'October 13, 2026',
    readTime: '7 min',
    tag: 'Guides',
  },
  {
    slug: 'best-free-vocal-remover-tools-compared-2026',
    title: 'Best Free Vocal Remover Tools Compared (2026)',
    excerpt:
      'We tested the top free vocal removers on quality, privacy, and limits — browser AI, desktop apps, and mobile. Here\u2019s what\u2019s actually worth your time.',
    date: 'October 13, 2026',
    readTime: '11 min',
    tag: 'Comparisons',
  },
  {
    slug: 'clean-up-podcast-audio-complete-guide',
    title: 'How to Clean Up Podcast Audio: A Complete Guide',
    excerpt:
      'From mic technique to noise reduction to loudness — the full workflow for professional-sounding podcasts, even in an untreated room.',
    date: 'October 13, 2026',
    readTime: '12 min',
    tag: 'Guides',
  },
];

export default function BlogPage() {
  return (
    <>
      <Seo
        title="Blog — Audio tips & how-tos | AI Music Remover"
        description="Practical guides to stem separation, karaoke tracks, and cleaning up recordings — plus plain-language explainers of the AI behind the tools."
        path="/blog"
      />
      <section className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Blog</p>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Learn to get more from your audio
        </h1>
        <p className="mt-4 text-muted text-lg max-w-2xl">
          Practical how-tos and plain-language explainers — no fluff, no filler.
        </p>

        <div className="mt-10 grid gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 hover:border-primary/50 hover:shadow-[var(--shadow-card)] transition-shadow"
            >
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary mb-3">
                {post.tag}
              </span>
              <h2 className="text-xl md:text-2xl font-bold">{post.title}</h2>
              <p className="mt-2 text-muted">{post.excerpt}</p>
              <p className="mt-4 text-sm text-muted">
                {post.date} &middot; {post.readTime} read
                <span className="text-primary font-medium ml-3">Read article &rarr;</span>
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
