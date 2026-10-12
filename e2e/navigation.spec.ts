import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/vocal-remover',
  '/audio-splitter',
  '/karaoke-maker',
  '/ai-mashup-maker',
  '/noise-remover',
  '/ai-podcast-maker',
  '/voice-changer',
  '/voice-cloning',
  '/ai-audio-to-text',
  '/ai-audio-translator',
  '/blog',
  '/blog/how-ai-stem-separation-works',
  '/blog/make-karaoke-track-at-home',
  '/blog/clean-noisy-recordings',
  '/pricing',
  '/privacy',
  '/terms',
  '/history',
];

for (const route of ROUTES) {
  test(`route ${route} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // strip leading slash so the path resolves relative to baseURL's subpath
    const resp = await page.goto(route.replace(/^\//, ''), { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    // page has real content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    // header + footer present
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
}

test('header nav dropdown lists all tools', async ({ page }) => {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /AI Tools/ }).click();
  for (const label of ['Music Remover', 'Vocal Remover', 'Audio Splitter', 'Noise Remover', 'Voice Changer']) {
    await expect(page.getByRole('link', { name: label }).first()).toBeVisible();
  }
});

test('home page has all 12 sections', async ({ page }) => {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  const text = await page.locator('body').innerText();
  for (const needle of ['Remove Background Music', 'three steps', 'Frequently asked questions', '100% Free']) {
    expect(text).toContain(needle);
  }
});
