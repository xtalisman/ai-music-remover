# Licenses — AI Music Remover

All original code, copy, design and illustrations in this project are the
property of the project owner. Third-party libraries and AI models used by
the app are listed below with their licenses. All are free for commercial use.

## JavaScript libraries (bundled)

| Library | Version | License | Use |
|---|---|---|---|
| react / react-dom | 18.x | MIT | UI framework |
| react-router-dom | 6.x | MIT | Routing |
| onnxruntime-web | 1.20.0 | MIT | On-device neural network inference (WASM) |
| @xenova/transformers | 2.17.2 | Apache-2.0 | Whisper transcription + Opus-MT translation pipelines |
| jszip | 3.x | MIT / GPL-3.0 dual | ZIP downloads of stems |
| lamejs | 1.2.x | MIT | MP3 encoding in the browser |
| docx | 9.x | MIT | DOCX transcript export |
| tailwindcss | 4.x | MIT | Styling |
| vite / vitest / typescript | — | MIT / Apache-2.0 | Build & test tooling (dev only) |

## AI models (downloaded at runtime from Hugging Face, cached in the visitor's browser)

| Model | Source | License | Use |
|---|---|---|---|
| Spleeter 4-stems ONNX (fp16) — vocals, drums, bass, other | Best-Practice/spleeter-4stems-onnx | Apache-2.0 | Stem separation |
| Whisper tiny (quantized) | Xenova/whisper-tiny | Apache-2.0 | Speech transcription |
| Opus-MT translation models (quantized) | Xenova/opus-mt-* | CC-BY-4.0 (model weights; code Apache-2.0) | Text translation |

Model weights are fetched from Hugging Face's CDN on first use and cached
locally; they are not redistributed with this repository.

## Notes

- No model or library above requires a paid license, API key, or attribution
  for commercial use, though attribution is appreciated.
- The demo audio samples in `public/samples/` are original synthesized audio
  created for this project.
- Logo and illustrations are original artwork created for this project.
