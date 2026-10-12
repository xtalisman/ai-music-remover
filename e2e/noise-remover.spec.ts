import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('noise remover: upload -> denoise -> download WAV', async ({ page }) => {
  await page.goto('noise-remover', { waitUntil: 'domcontentloaded' });

  // upload the fixture via the file input
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(path.resolve(__dirname, 'fixture.wav'));

  // wait for the denoise button to appear and click it
  const denoiseBtn = page.getByRole('button', { name: /Remove noise/i });
  await expect(denoiseBtn).toBeVisible({ timeout: 30000 });
  await denoiseBtn.click();

  // wait for result (before/after tabs)
  await expect(page.getByRole('tab', { name: /After/i })).toBeVisible({ timeout: 120000 });

  // download the WAV and verify it's real audio bytes
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Cleaned \(WAV\)/i }).click();
  const download = await downloadPromise;
  const dlPath = await download.path();
  expect(dlPath).toBeTruthy();
  const fs = await import('fs');
  const size = fs.statSync(dlPath!).size;
  // 5s stereo 16-bit WAV at 44.1kHz ~= 882kB; allow resampled variants
  expect(size).toBeGreaterThan(100000);
});
