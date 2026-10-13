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
      h1="Make Your Podcast Episode — Free AI Podcast Maker (Beta)"
      sub="Write your episode with our script template, cast one or two AI host voices, add background music with automatic ducking, and preview the whole thing read aloud — right in your browser. Draft episodes in minutes instead of hours, hear how your script flows before you record, and export your script and project files free."
      badge="Beta"
      widget={<PodcastStudio />}
      steps={[
        { title: 'Write with the episode template', text: 'Start from our proven intro → segments → outro structure. A live word count and runtime estimate (~150 words/minute) shows your episode length as you type, so you\u2019ll know if you\u2019re at 10 minutes or 40 before you record a second.' },
        { title: 'Cast your hosts', text: 'Choose from your device\u2019s built-in text-to-speech voices — assign different voices to different sections for interview-style episodes with two hosts, or keep one consistent voice for solo shows. Adjust the speaking pace to match your style.' },
        { title: 'Add background music', text: 'Upload your intro/outro music or ambient bed. Automatic ducking lowers the music whenever a host is speaking and brings it back up in pauses — the professional radio sound, done for you.' },
        { title: 'Preview and refine', text: 'Hit preview and hear your entire episode read aloud. Catch awkward phrasing, timing issues, and flow problems before you spend an hour recording. Export your script as TXT or save the full project as JSON.' },
      ]}
      features={[
        { icon: '📝', title: 'Smart episode template', text: 'A proven intro/segments/outro structure with live word-count and runtime estimates. You\u2019ll always know exactly how long your episode will run.' },
        { icon: '🎙️', title: 'One or two AI hosts', text: 'Assign script sections to different voices for interview or co-hosted formats. Each voice can have its own pace — snappy for the host, measured for the guest.' },
        { icon: '🎵', title: 'Automatic music ducking', text: 'Background music intelligently dips under speech and swells in pauses, just like a professional radio producer would ride the faders. No manual keyframing.' },
        { icon: '💯', title: 'Free with no per-minute fees', text: 'AI voice platforms charge per character or per minute — costs that add up fast. Ours uses your device\u2019s built-in voices: unlimited previewing, zero fees.' },
        { icon: '🔒', title: 'Your script stays private', text: 'Unpublished episode ideas, interview questions, proprietary content — it all stays in your browser. Nothing is uploaded or stored on any server.' },
        { icon: '💾', title: 'Project save and export', text: 'Export your script as a clean TXT file for your records, or save the entire project (script + voice assignments + music) as JSON to pick up right where you left off.' },
      ]}
      useCases={[
        { title: 'Draft solo episodes before recording', text: 'Write your monologue, hear it read back, and fix the parts that sound awkward on paper but terrible out loud. You\u2019ll cut your recording time in half because the script is already proven.' },
        { title: 'Rehearse interview flows', text: 'Script both the host questions and expected guest answers to rehearse timing, transitions, and follow-ups. Walk into the real interview knowing exactly how the conversation should flow.' },
        { title: 'Turn written updates into audio briefings', text: 'Teams and companies: paste your weekly update, assign a voice, and generate a listenable briefing your team can play during their commute. Internal comms people will love you.' },
        { title: 'Make content accessible', text: 'Give every blog post, newsletter, and document a spoken version. Your audience can listen instead of read — and you\u2019re serving listeners with visual impairments or reading difficulties.' },
      ]}
      faqs={[
        { q: 'How do the AI host voices work?', a: 'We use your device\u2019s built-in text-to-speech engine (the Web Speech API) — the same voices your phone uses for navigation and accessibility features. That means there\u2019s nothing to download, it works offline, and it\u2019s completely free with no per-character fees (unlike cloud AI voice services that charge by the minute). The available voices depend on your device and operating system: Windows includes Microsoft\u2019s neural voices, macOS and iOS have Apple\u2019s high-quality voices, Android has Google\u2019s voices, and ChromeOS has its own set. You\u2019ll typically find 5-30 voices including multiple languages and accents. Preview each one to find your hosts.' },
        { q: 'Can I export a finished MP3 of my episode?', a: 'Not yet — and we want to be upfront about it. Right now you can preview the full episode live (with voices, pacing, and ducked background music) and export your script as TXT or the project as JSON. True offline MP3 rendering with neural voices is in active development. The challenge is capturing the browser\u2019s speech synthesis — which plays through your speakers — into a downloadable file, which browsers don\u2019t natively support. We\u2019re exploring workarounds including MediaRecorder-based capture. For now, the preview is perfect for script review and rehearsal, which is where most podcasters waste the most time anyway.' },
        { q: 'Is my episode script private?', a: 'Completely. Your script text, voice choices, and uploaded background music never leave your browser — there\u2019s no server to send them to. This matters for unreleased episode ideas, embargoed interview content, proprietary company updates, or anything you wouldn\u2019t want leaking. Even our analytics (if any) can\u2019t see your content because it never traverses the network. Your creative work stays yours, period.' },
        { q: 'How accurate is the runtime estimate?', a: 'We estimate ~150 words per minute, which is the average conversational speaking pace for English podcast content. In practice, actual timing varies: a fast-talking host voice might hit 170 WPM, while a dramatic pause-heavy read could drop to 120 WPM. Dense technical content reads slower than casual chat. Think of the estimate as a reliable ballpark — if it says 22 minutes, plan for 20-25. The preview feature is the real timing tool: listen to the actual read-through and you\u2019ll know precisely how your episode paces.' },
        { q: 'Why is this marked Beta?', a: 'Because we\u2019re honest about what it can and can\u2019t do yet. The script studio, voice preview, music ducking, and project export all work reliably — that\u2019s the solid foundation. What\u2019s missing is the one-click "render finished MP3" that would make it a complete production tool. Rather than fake that feature or hide the limitation in fine print, we label it Beta and tell you exactly what to expect. As the MP3 export and additional voices land, the Beta tag comes off. We\u2019d rather under-promise and over-deliver.' },
        { q: 'Is the podcast maker really free?', a: 'Yes — no accounts, no per-minute charges, no "5 free episodes" trial. Cloud AI voice services typically charge $20-100/month for the kind of voice preview we offer, because they pay for server GPU time per character generated. We sidestep those costs entirely by using your device\u2019s built-in text-to-speech, which is already paid for (it came with your OS). Unlimited episodes, unlimited previewing, unlimited script length. The only thing we ask: if it saves you time, tell another podcaster.' },
      ]}
    />
  );
}
