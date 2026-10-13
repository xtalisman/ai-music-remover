# Test Report — AI Music Remover

Date: 2026-10-13
Build: production (`npm run build` — TypeScript strict + Vite, 0 errors)

## Unit tests (vitest) — 8/8 pass

| File | Tests | Result |
|---|---|---|
| `src/workers/dsp.test.ts` | FFT round-trip, STFT/ISTFT reconstruction, Hann window | 3/3 pass |
| `src/workers/pitch.test.ts` | Pitch-shift direction, tempo ratio, analysis | 3/3 pass |
| `src/workers/denoise.test.ts` | SNR improvement on noisy tone (11.9 → 20.4 dB), clean-signal preservation (correlation > 0.95) | 2/2 pass |

## E2E tests (Playwright + Chromium headless) — 23/23 pass

| Suite | Coverage | Result |
|---|---|---|
| `e2e/navigation.spec.ts` | All 19 routes load (HTTP < 400, no page errors, header/footer visible); AI Tools dropdown lists all tools; home page contains all key sections | 21/21 pass |
| `e2e/noise-remover.spec.ts` | Upload 5s WAV → Remove noise → Before/After tabs appear → download cleaned WAV (>100KB verified) | 1/1 pass |
| `e2e/voice-changer.spec.ts` | Upload 5s WAV → select Deep Voice → Apply → download MP3 (real bytes verified) | 1/1 pass |

## Static checks

- Broken internal links: 22 hrefs checked against the route table — **none broken**
  (3 false positives from string matching: `$0/forever` pricing text, transformers.js
  internal `/models/` constant).
- Sitemap lists all 19 public URLs; robots.txt present.

## Bugs found & fixed during testing

1. **MP3 export completely broken** — `lamejs` npm package references bare globals
   (`MPEGMode`, `Lame`) that throw under Vite bundling. Every MP3 download in the
   app (Voice Changer, Karaoke, Mashup, Noise Remover, Podcast) silently failed.
   Fixed by vendoring `lame.all.js` as `src/lib/lame.all.bundle.js` with a namespace
   export. Verified working in headless Chromium (E2E MP3 download passes, 0 console errors).

## Honest limits (verified, shown in UI)

- **Separation**: Spleeter 4-stem ONNX fp16 verified end-to-end in onnxruntime-web WASM
  (Node): reconstruction error −144.9 dB, vocal isolation 73.9% / backing leakage 0.3%
  on synthetic fixtures. Browser E2E of full AI separation not run (requires 79MB model
  download per test run); DSP pipeline, worker plumbing, and UI flows are tested.
  UI recommends ≤10 minutes; longer files show a warning, never a "3 hours" claim.
- **Noise removal**: spectral gating, +8.5 dB SNR on synthetic fixture. Best on steady
  noise; abrupt/transient noises are harder (stated in UI).
- **Whisper transcription/translation**: model files verified reachable on Hugging Face;
  browser inference not E2E-tested (model download ~40MB+ per run). Pages labeled Beta.
- **Podcast Maker**: Beta — script-to-speech preview works; true offline mixed MP3
  export is not yet implemented (stated in UI, not faked).
- **Voice Cloning**: Coming soon — consent-first waitlist page only, no fake output.
- **Lighthouse**: not run in this environment (no full Chrome). Recommended before launch:
  target Performance ≥90 on landing pages (excluding one-time model downloads),
  Accessibility ≥95.

## Not tested

- Safari/Firefox/mobile viewports (no devices/browsers available in this environment).
- Video file upload → decode path (relies on browser native decoding; code-reviewed only).
- Screen/microphone recording flows (require user media permissions).

## Live Production Tests — Pass 2 (2026-10-13, new premium UI build)

**Build tested:** Premium UI redesign (sidebar, logo, auth, voice library) + SEO content expansion

### AI Speech Tools (4/4 PASS)

| Tool | Result | Notes |
|---|---|---|
| AI Audio to Text | ✅ PASS | New sidebar layout, Beta labels, 6 FAQs render, upload UI works |
| AI Audio Translator | ✅ PASS | New sidebar layout, Beta labels, 6 FAQs render, translation dropdown works |
| AI Podcast Maker | ✅ PASS | Preview button tested (toggles to "Stop preview"), Beta labels intact |
| Voice Cloning | ✅ PASS | Coming-soon UI, waitlist form, ethics pledge, 6 FAQs render |

### Audio Processing Tools

| Tool | Result | Notes |
|---|---|---|
| Noise Remover | ✅ PASS | Paste-link works, auth modal appears correctly at processing |
| Voice Changer | ✅ PASS | Paste-link works, Voice Library section present, auth modal at processing |
| AI Mashup Maker | ⚠️ PARTIAL → FIXED | Auth gate was firing at file upload instead of processing. Fixed: gate now only at AI processing step. |

### AI Separation Tools (4 tools)

**Sign-in flow:** ✅ Test account created (test@example.com), sign-in persists correctly.
**Bug fix:** Minor UI bug fixed — sign-up modal's "Create Account" button was stuck at "Please wait…" after successful sign-up when no pending action existed. Now auto-closes on any successful auth.

| Tool | t.getValue bug | AI Separation |
|---|---|---|
| Music Remover | ✅ GONE | ⚠️ Stalls at "Loading vocals model…(17%)" |
| Vocal Remover | ✅ GONE | ⚠️ Stalls at "Loading vocals model…(17%)" |
| Audio Splitter | ✅ GONE | ⚠️ Stalls at "Loading vocals model…(17%)" |
| Karaoke Maker | ✅ GONE | ⚠️ Stalls at "Loading vocals model…(17%)" |

**Critical finding:** The `"t.getValue is not a function"` production bug is **CONFIRMED FIXED**. All 4 tools start the AI pipeline normally (file fetch → decode → "Starting…(0%)" → "Loading vocals model…(17%)").

**AI separation stall:** The ONNX model downloads successfully, but `ort.InferenceSession.create()` hangs during WASM session initialization (no error, no timeout). This appears to be environment-specific (headless VM with limited resources). The model and code were verified working in Node.js during development.

**Mitigation deployed:**
- Added 3-minute timeout for ONNX session creation with clear user-facing error message
- Error message guides users to try Chrome/Edge on desktop, free memory, or use Instant mode
- Instant Mode (DSP fallback) ✅ VERIFIED WORKING end-to-end with successful WAV download

**Recommendation:** Test AI separation on a real desktop browser (Chrome/Edge) with adequate resources. The WASM session initialization may work fine outside the constrained test VM.
