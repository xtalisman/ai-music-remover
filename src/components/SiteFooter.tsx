import { Link } from 'react-router-dom';

const tools = [
  ['Music Remover', '/'],
  ['Vocal Remover', '/vocal-remover'],
  ['Audio Splitter', '/audio-splitter'],
  ['Noise Remover', '/noise-remover'],
  ['AI Podcast Maker', '/ai-podcast-maker'],
  ['Karaoke Maker', '/karaoke-maker'],
  ['AI Mashup Maker', '/ai-mashup-maker'],
  ['AI Audio to Text', '/ai-audio-to-text'],
  ['AI Audio Translator', '/ai-audio-translator'],
  ['Voice Changer', '/voice-changer'],
  ['Voice Cloning', '/voice-cloning'],
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-bold text-lg mb-2">AI Music Remover</div>
          <p className="text-sm text-muted">Free AI audio tools that run entirely in your browser. Your files never leave your device.</p>
        </div>
        <div>
          <div className="font-semibold mb-3 text-sm">Tools</div>
          <ul className="space-y-2 text-sm text-muted">
            {tools.slice(0, 6).map(([label, href]) => (
              <li key={href}><Link to={href} className="hover:text-primary">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3 text-sm">More tools</div>
          <ul className="space-y-2 text-sm text-muted">
            {tools.slice(6).map(([label, href]) => (
              <li key={href}><Link to={href} className="hover:text-primary">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3 text-sm">Company</div>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li><Link to="/pricing" className="hover:text-primary">Pricing</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-sm text-muted">
        © AI Music Remover {new Date().getFullYear()}. All processing happens locally in your browser.
      </div>
    </footer>
  );
}
