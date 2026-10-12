/* Transcription + translation worker (transformers.js / Whisper).
   Models download on first use from Hugging Face and are cached by transformers.js.
   Protocol mirrors audio.worker.ts: {type:'job'|'cancel'} in, progress/result/error out.
*/
import { pipeline, type TextToAudioPipeline } from '@xenova/transformers';

type Transcriber = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{
  text: string;
  chunks?: { timestamp: [number, number]; text: string }[];
}>;
type Translator = (text: string | string[]) => Promise<{ translation_text: string }[] | { translation_text: string }>;

let transcriber: Transcriber | null = null;
let translators = new Map<string, Translator>();
const abortControllers = new Map<string, AbortController>();

function postProgress(id: string, fraction: number, label: string): void {
  self.postMessage({ type: 'progress', id, fraction, label });
}

async function getTranscriber(
  id: string, signal: AbortSignal,
): Promise<Transcriber> {
  if (transcriber) return transcriber;
  const { env } = await import('@xenova/transformers');
  // Use browser cache; allow remote models.
  env.allowRemoteModels = true;
  const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    quantized: true,
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (signal.aborted) return;
      if (p.status === 'progress' && typeof p.progress === 'number') {
        postProgress(id, p.progress * 0.5, `Downloading speech model (${Math.round(p.progress)}%, first time only)…`);
      } else if (p.status === 'downloading') {
        postProgress(id, 0.02, 'Downloading speech model (first time only)…');
      }
    },
  });
  transcriber = pipe as unknown as Transcriber;
  return transcriber;
}

async function runTranscribe(
  id: string, audio: Float32Array, signal: AbortSignal,
): Promise<void> {
  const tr = await getTranscriber(id, signal);
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 0.55, 'Transcribing…');
  const out = await tr(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 1, 'Done');
  self.postMessage({
    type: 'result', id,
    result: { kind: 'transcript', text: out.text, chunks: out.chunks || [] },
  });
}

async function getTranslator(id: string, model: string, signal: AbortSignal): Promise<Translator> {
  const hit = translators.get(model);
  if (hit) return hit;
  const pipe = await pipeline('translation', model, {
    quantized: true,
    progress_callback: (p: { status: string; progress?: number }) => {
      if (signal.aborted) return;
      if (p.status === 'progress' && typeof p.progress === 'number') {
        postProgress(id, p.progress * 0.4, `Downloading translation model (${Math.round(p.progress)}%, first time only)…`);
      }
    },
  });
  const tr = pipe as unknown as Translator;
  translators.set(model, tr);
  return tr;
}

async function runTranslate(
  id: string, texts: string[], model: string, signal: AbortSignal,
): Promise<void> {
  const tr = await getTranslator(id, model, signal);
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  postProgress(id, 0.45, 'Translating…');
  // translate in batches to keep memory flat and allow cancellation
  const out: string[] = [];
  const BATCH = 8;
  for (let i = 0; i < texts.length; i += BATCH) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const batch = texts.slice(i, i + BATCH);
    const res = await tr(batch);
    const arr = Array.isArray(res) ? res : [res];
    for (const r of arr) out.push(r.translation_text);
    postProgress(id, 0.45 + (i / texts.length) * 0.5, `Translating… (${Math.min(i + BATCH, texts.length)}/${texts.length})`);
  }
  postProgress(id, 1, 'Done');
  self.postMessage({ type: 'result', id, result: { kind: 'translation', texts: out } });
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as
    | { type: 'job'; id: string; jobType: 'transcribe' | 'translate'; payload: { audio?: Float32Array; texts?: string[]; model?: string } }
    | { type: 'cancel'; id: string };
  if (msg.type === 'cancel') {
    abortControllers.get(msg.id)?.abort();
    abortControllers.delete(msg.id);
    return;
  }
  const { id, jobType, payload } = msg;
  const controller = new AbortController();
  abortControllers.set(id, controller);
  try {
    if (jobType === 'transcribe') {
      if (!payload.audio) throw new Error('missing audio');
      await runTranscribe(id, payload.audio, controller.signal);
    } else if (jobType === 'translate') {
      if (!payload.texts || !payload.model) throw new Error('missing texts/model');
      await runTranslate(id, payload.texts, payload.model, controller.signal);
    } else {
      throw new Error(`unknown job type: ${jobType}`);
    }
  } catch (err) {
    const message = err instanceof DOMException && err.name === 'AbortError'
      ? 'cancelled'
      : (err as Error).message || 'failed';
    self.postMessage({ type: 'error', id, message });
  } finally {
    abortControllers.delete(id);
  }
};

export type { TextToAudioPipeline };
export {};
