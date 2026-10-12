import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold pt-6">{children}</h2>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-ink/90 leading-relaxed">{children}</p>;
}

export default function PrivacyPage() {
  return (
    <>
      <Seo
        title="Privacy Policy | AI Music Remover"
        description="How AI Music Remover handles your data: everything runs in your browser, nothing is uploaded, and local history stays on your device."
        path="/privacy"
      />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted mt-3">Last updated: October 13, 2026</p>

        <div className="mt-8 space-y-5">
          <P>
            AI Music Remover is designed so there is very little personal data to protect:
            <strong> all audio processing happens in your browser, on your device.</strong> Your
            files are never uploaded to our servers — because we do not operate any servers
            that receive them.
          </P>

          <H2>No accounts, no tracking</H2>
          <P>
            There is no sign-up, no login, and no analytics that follows you around. We do not
            use advertising cookies or cross-site trackers. The site is hosted as static files
            on GitHub Pages, which may keep standard server logs (such as IP addresses) as
            part of normal web hosting; we do not see or use those logs for profiling.
          </P>

          <H2>Your audio stays on your device</H2>
          <P>
            When you upload, record, or paste a link to audio, it is decoded and processed
            locally by JavaScript and WebAssembly running in your browser tab. Separated
            stems, transcriptions, and exports are generated on your machine and downloaded
            directly to it. At no point is your audio transmitted to us or to any third party
            for processing.
          </P>

          <H2>Local history (IndexedDB)</H2>
          <P>
            If you choose to keep results, they are stored in your browser&apos;s IndexedDB
            storage — again, only on your device. You can delete individual entries or wipe
            everything at any time from the <Link to="/history" className="text-primary font-medium hover:underline">History</Link> page.
            Clearing your browser&apos;s site data also removes this storage.
          </P>

          <H2>AI model downloads</H2>
          <P>
            The AI models (for example, the stem-separation and transcription models) are
            downloaded once from public content delivery networks, including Hugging Face&apos;s
            CDN, and then cached in your browser. Downloading a model means your browser
            contacts those CDNs; their own privacy policies apply to that download request.
            No audio or personal content is sent as part of model downloads.
          </P>

          <H2>Microphone and screen recording</H2>
          <P>
            Recording features use your browser&apos;s standard media permissions. Permission
            is requested by the browser itself, can be revoked at any time in your browser
            settings, and recorded audio is processed locally exactly like an uploaded file.
          </P>

          <H2>Children</H2>
          <P>
            The service is not directed at children under 13, and we do not knowingly collect
            data from them — consistent with the fact that we collect essentially nothing
            from anyone.
          </P>

          <H2>Changes to this policy</H2>
          <P>
            If this policy changes, the updated version will be posted here with a new
            &ldquo;last updated&rdquo; date. Because the app runs locally, material changes are
            unlikely; the core promise — your audio never leaves your device — will not change.
          </P>

          <H2>Contact</H2>
          <P>
            Questions about this policy? Reach us via the issues page of the AI Music Remover
            GitHub repository.
          </P>
        </div>
      </article>
    </>
  );
}
