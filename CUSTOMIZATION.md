# Customization Guide — AI Music Remover

Short guide to the changes owners most often want. All files are relative to
the project root.

## Colors

Every color lives in `src/tokens.css` as CSS variables. Change them once and
the whole site follows:

- `--color-primary`, `--color-primary-deep` — main brand color
- `--color-secondary` — secondary accents
- `--color-accent` — CTA highlights
- `--color-background`, `--color-surface` — page and card backgrounds
- `--color-text`, `--color-muted` — text colors
- `--radius-card`, `--radius-btn` — corner roundness

Dark-mode variants are defined under `[data-theme='dark']`.

## Copy & branding

- Site name: search for "AI Music Remover" in `src/` (header, footer, SEO titles).
- Logo: replace `public/logo.svg` (and `public/favicon.png`).
- Home page sections: `src/pages/HomePage.tsx` (12 sections, each clearly marked).
- Tool page marketing copy: each page in `src/pages/` passes `features`,
  `useCases`, `faqs` etc. to the shared `ToolPage` component.

## Adding / removing a tool

1. Create the page in `src/pages/` (copy an existing simple one).
2. Add a lazy route in `src/App.tsx`.
3. Add it to the `TOOLS` array in `src/components/SiteHeader.tsx` and the
   `tools` array in `src/components/SiteFooter.tsx`.
4. Add the URL to `public/sitemap.xml`.

## Limits

- Recommended separation max (default 10 min): `src/components/UploadWidget.tsx`
  (the `MAX_MINUTES` constant and the rights/limit notice).
- Worker chunking for long files: `src/workers/separator.ts`.

## Blog

Posts live in `src/pages/blog/`. To add one:

1. Create `src/pages/blog/MyPost.tsx` (copy an existing post).
2. Add it to the list in `src/pages/BlogPage.tsx`.
3. Add a lazy route `/blog/my-post` in `src/App.tsx`.
4. Add the URL to `public/sitemap.xml`.

## History (local)

Processing history uses IndexedDB via `src/lib/history.ts`. Entries are stored
only on the visitor's device. The History page (`src/pages/HistoryPage.tsx`)
lists and deletes them.

## Deployment

`vite.config.ts` sets `base: '/ai-music-remover/'` for GitHub Pages project
sites. If you move to a custom domain, change `base` to `'/'` and update the
`SITE_URL` in `src/components/Seo.tsx`, `public/sitemap.xml`, and
`public/robots.txt`.
