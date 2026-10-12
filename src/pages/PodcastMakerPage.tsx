import { useEffect, useRef, useState } from 'react';
import ToolPage from '../components/ToolPage';

interface Segment { id: string; title: string; text: string; host: 1 | 2; }

const WPM = 150;

function emptySegment(title: string, host: 1 | 2 = 1): Segment {
  return { id: `seg-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, text: '', host };
}

function PodcastStudio() {
  const [segments, setSegments] = useState<Segment[]>([
    { ...emptySegment('Intro'), text: 'Welcome to the show! Today we\u2019re talking about…' },
    emptySegment('Main segment'),
    { ...emptySegment('Outro'), text: 'Thanks for listening! Subscribe for more episodes.' },
  ]);
  const [hostCount, setHostCount] = useState<1 | 2>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice1, setVoice1] = useState('');
  const [voice2, setVoice2] = useState('');
  const [rate, setRate] = useState(1);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVol, setMusicVol] = useState(0.25);
  const [ducking, setDucking] = useState(0.7);
  const [playing, setPlaying] = useState(false);
  const [currentSeg, setCurrentSeg] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const musicGain = useRef<GainNode | null>(null);
  const musicSrc = useRef<AudioBufferSourceNode | null>(null);
  const stopFlag = useRef(false);

  useEffect(() => {
    const load = () => {
      const vs = speechSynthesis.getVoices();
      if (vs.length) {
        setVoices(vs);
        setVoice1((v) => v || vs.find((x) => x.default)?.name || vs[0].name);
        setVoice2((v) => v || vs[1]?.name || vs[0].name);
      }
    };
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => { speechSynthesis.cancel(); stopMusic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = segments.reduce((a, s) => a + words(s.text), 0);
  const estMin = totalWords / WPM;

  const updateSeg = (id: string, patch: Partial<Segment>) =>
    setSegments((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addSeg = () => setSegments((ss) => [...ss.slice(0, -1), emptySegment(`Segment ${ss.length}`), ss[ss.length - 1]]);
  const removeSeg = (id: string) => setSegments((ss) => (ss.length > 1 ? ss.filter((s) => s.id !== id) : ss));

  const stopMusic = () => {
    try { musicSrc.current?.stop(); } catch { /* noop */ }
    musicSrc.current = null;
  };

  const startMusic = async () => {
    if (!musicFile) return;
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const ctx = audioCtx.current;
    stopMusic();
    const buf = await ctx.decodeAudioData(await musicFile.arrayBuffer());
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain();
    g.gain.value = musicVol;
    src.connect(g).connect(ctx.destination);
    src.start();
    musicSrc.current = src;
    musicGain.current = g;
  };

  const duck = (on: boolean) => {
    if (!musicGain.current || !audioCtx.current) return;
    const target = on ? musicVol * (1 - ducking) : musicVol;
    musicGain.current.gain.setTargetAtTime(target, audioCtx.current.currentTime, 0.4);
  };

  const speak = (text: string, voiceName: string): Promise<void> =>
    new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = voices.find((x) => x.name === voiceName);
      if (v) u.voice = v;
      u.rate = rate;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });

  const preview = async () => {
    if (playing) { stop(); return; }
    stopFlag.current = false;
    setPlaying(true);
    await startMusic();
    for (const seg of segments) {
      if (stopFlag.current) break;
      if (!seg.text.trim()) continue;
      setCurrentSeg(seg.id);
      duck(true);
      await speak(seg.text, seg.host === 1 ? voice1 : voice2);
      duck(false);
      if (stopFlag.current) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    stop();
  };

  const stop = () => {
    stopFlag.current = true;
    speechSynthesis.cancel();
    stopMusic();
    setPlaying(false);
    setCurrentSeg(null);
  };

  const exportScript = () => {
    const text = segments.map((s) => `## ${s.title} (Host ${s.host})\n\n${s.text}`).join('\n\n');
    const blob = new Blob([`# Podcast Script\n# ~${totalWords} words, ~${estMin.toFixed(1)} min\n\n${text}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'podcast-script.txt';
    a.click();
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ segments, hostCount, voice1, voice2, rate, musicVol, ducking }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'podcast-project.json';
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Your episode script</h3>
          <span className="text-sm text-muted">~{totalWords} words · ~{estMin.toFixed(1)} min</span>
        </div>
        <div className="flex items-center gap-3 mb-6 text-sm">
          <span className="font-medium">Hosts:</span>
          <button onClick={() => setHostCount(1)} className={`px-4 py-1.5 rounded-full ${hostCount === 1 ? 'bg-primary text-white' : 'bg-surface-2'}`}>1 host</button>
          <button onClick={() => setHostCount(2)} className={`px-4 py-1.5 rounded-full ${hostCount === 2 ? 'bg-primary text-white' : 'bg-surface-2'}`}>2 hosts</button>
        </div>
        {segments.map((seg) => (
          <div key={seg.id} className={`rounded-2xl border p-4 mb-3 ${currentSeg === seg.id ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
            <div className="flex items-center gap-2 mb-2">
              <input value={seg.title} onChange={(e) => updateSeg(seg.id, { title: e.target.value })}
                className="font-bold bg-transparent flex-1 outline-none" placeholder="Section title" />
              {hostCount === 2 && (
                <select value={seg.host} onChange={(e) => updateSeg(seg.id, { host: Number(e.target.value) as 1 | 2 })}
                  className="text-xs border border-border rounded-full px-2 py-1 bg-background">
                  <option value={1}>Host 1</option>
                  <option value={2}>Host 2</option>
                </select>
              )}
              <span className="text-xs text-muted">{words(seg.text)}w</span>
              <button onClick={() => removeSeg(seg.id)} className="text-muted hover:text-danger text-sm">✕</button>
            </div>
            <textarea value={seg.text} onChange={(e) => updateSeg(seg.id, { text: e.target.value })}
              rows={3} placeholder="Write what the host says here…"
              className="w-full bg-transparent text-sm outline-none resize-y" />
          </div>
        ))}
        <button onClick={addSeg} className="text-sm font-semibold text-primary hover:underline">+ Add segment</button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8 mb-4">
        <h3 className="font-bold text-lg mb-4">Voices &amp; sound</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <label className="block text-sm">
            <span className="font-medium">Host 1 voice</span>
            <select value={voice1} onChange={(e) => setVoice1(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background text-sm">
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
          {hostCount === 2 && (
            <label className="block text-sm">
              <span className="font-medium">Host 2 voice</span>
              <select value={voice2} onChange={(e) => setVoice2(e.target.value)}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background text-sm">
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="flex items-center gap-3 text-sm mb-4">
          <span className="w-32 font-medium">Speech rate</span>
          <input type="range" min={0.7} max={1.3} step={0.05} value={rate}
            onChange={(e) => setRate(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" />
          <span className="w-12 text-right text-muted">{rate.toFixed(2)}×</span>
        </label>
        <label className="block text-sm mb-4">
          <span className="font-medium">Background music (optional)</span>
          <input type="file" accept="audio/*" onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
            className="mt-1 block text-sm" />
          {musicFile && <span className="text-xs text-muted">{musicFile.name}</span>}
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 text-sm">
            <span className="w-24 font-medium">Music vol</span>
            <input type="range" min={0} max={0.8} step={0.05} value={musicVol}
              onChange={(e) => setMusicVol(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-24 font-medium">Ducking</span>
            <input type="range" min={0} max={0.95} step={0.05} value={ducking}
              onChange={(e) => setDucking(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={preview} className={`px-6 py-3 rounded-full font-bold ${playing ? 'bg-danger text-white' : 'bg-accent text-[var(--color-accent-text)]'}`}>
          {playing ? '⏹ Stop preview' : '▶ Preview episode'}
        </button>
        <button onClick={exportScript} className="px-4 py-3 rounded-full border border-border text-sm font-medium">⬇ Script (.txt)</button>
        <button onClick={exportProject} className="px-4 py-3 rounded-full border border-border text-sm font-medium">⬇ Project (.json)</button>
      </div>
      <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4 mt-4 text-sm text-muted">
        <strong>Beta note:</strong> Preview uses your device’s built-in voices. Studio-quality offline MP3 export
        with neural voices is in development — for now, export the script or record the preview with your
        device’s audio recorder.
      </div>
      <p className="text-xs text-muted mt-4">Tip: write numbers and abbreviations out in full (“twenty twenty-four”) for the most natural speech.</p>
    </div>
  );
}

export default function PodcastMakerPage() {
  return (
    <ToolPage
      path="/ai-podcast-maker"
      seoTitle="AI Podcast Maker — Script Studio & Voice Preview Free | AI Music Remover"
      seoDescription="Build podcast episodes free in your browser: script templates, 1-2 host voices, background music with ducking, live preview and script export."
      h1="Make your podcast episode"
      sub="Write your script with our episode template, pick host voices, add background music — then preview it live."
      badge="Beta"
      widget={<PodcastStudio />}
      steps={[
        { title: 'Write your script', text: 'Use the built-in intro / segments / outro template — we estimate the runtime as you type.' },
        { title: 'Cast your hosts', text: 'Pick from your device\u2019s voices for one or two hosts, set the pace.' },
        { title: 'Add music & preview', text: 'Upload background music with auto-ducking, then hear the full episode read aloud.' },
      ]}
      features={[
        { icon: '📝', title: 'Episode template', text: 'Intro, segments and outro structure with live word-count and timing.' },
        { icon: '🎙️', title: '1–2 hosts', text: 'Assign sections to different voices for interview-style episodes.' },
        { icon: '🎵', title: 'Music ducking', text: 'Background music automatically dips under speech.' },
        { icon: '💯', title: 'Free', text: 'No accounts, no per-minute fees.' },
        { icon: '🔒', title: 'Private', text: 'Your script never leaves your device.' },
        { icon: '💾', title: 'Project export', text: 'Save your episode as a reusable project file.' },
      ]}
      useCases={[
        { title: 'Solo shows', text: 'Draft and hear your monologue episodes before recording.' },
        { title: 'Interview prep', text: 'Script both sides of an interview to rehearse the flow.' },
        { title: 'Internal updates', text: 'Turn written updates into listenable briefings.' },
        { title: 'Accessibility', text: 'Give written content a spoken version.' },
      ]}
      faqs={[
        { q: 'How do the voices work?', a: 'We use your device\u2019s built-in text-to-speech voices, so there\u2019s nothing to download and it works offline. Voice choice varies by device and browser.' },
        { q: 'Can I export an MP3 of the episode?', a: 'Not yet — offline neural-voice MP3 export is in development. For now you can preview the full episode live and export the script.' },
        { q: 'Is my script private?', a: 'Yes. Everything, including the script text, stays in your browser.' },
        { q: 'How accurate is the runtime estimate?', a: 'It assumes ~150 words per minute. Actual pacing varies with the voice and content.' },
        { q: 'Is it free?', a: 'Completely free, no sign-up.' },
      ]}
    />
  );
}
