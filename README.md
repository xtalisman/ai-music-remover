# AI Music Remover

Free AI audio tools that run 100% in the visitor's browser. No sign-up, no uploads,
no servers, no cost.

**Live site:** https://xtalisman.github.io/ai-music-remover/

## Tools

| Tool | Route | Engine |
|---|---|---|
| Music Remover | `/` | Spleeter 4-stem ONNX (vocals / drums / bass / other → vocal, music, other) |
| Vocal Remover | `/vocal-remover` | Same AI engine, vocals vs instrumental |
| Audio Splitter | `/audio-splitter` | Full 4-stem split with mixer |
| Karaoke Maker | `/karaoke-maker` | Vocal removal + key/tempo change |
| AI Mashup Maker | `/ai-mashup-maker` | Separates two songs, matches BPM/key |
| Noise Remover | `/noise-remover` | Spectral-gating noise reduction |
| AI Podcast Maker | `/ai-podcast-maker` | Script → speech (Beta) |
| Voice Changer | `/voice-changer` | 6 DSP voice effects |
| Audio to Text | `/ai-audio-to-text` | Whisper tiny (Beta) |
| Audio Translator | `/ai-audio-translator` | Whisper + Opus-MT, 10 pairs (Beta) |
| Voice Cloning | `/voice-cloning` | Coming soon |

Plus: blog, pricing, processing history (local), privacy/terms, FAQ schema, sitemap.

## Tech

- Vite + React 18 + TypeScript + Tailwind CSS v4
- `onnxruntime-web` (WASM) for stem separation — Spleeter 4stems fp16 ONNX
  (~79MB total, downloaded once per visitor from Hugging Face, cached)
- `@xenova/transformers` for Whisper + translation (downloaded on first use)
- Web Workers keep the UI responsive; `lamejs` for MP3 export; `jszip` for ZIPs
- Deployed as a static site on GitHub Pages

## Develop

```bash
npm install
npm run dev      # local dev server
npx vitest run   # unit tests
npm run build    # production build -> dist/
```

## Deploy

Push to `main` — the `deploy.yml` workflow builds, runs tests, and publishes
to GitHub Pages automatically. SPA fallback is handled via `dist/404.html`.

See `CUSTOMIZATION.md` for how to change colors, copy, tools, and limits,
and `LICENSES.md` for third-party licenses.
