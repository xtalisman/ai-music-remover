import type { ReactNode } from 'react';
import Seo from '../components/Seo';

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold pt-6">{children}</h2>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-ink/90 leading-relaxed">{children}</p>;
}

export default function TermsPage() {
  return (
    <>
      <Seo
        title="Terms of Use | AI Music Remover"
        description="The terms for using AI Music Remover: your rights to uploaded audio, acceptable use, and service limitations."
        path="/terms"
      />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Terms of Use</h1>
        <p className="text-sm text-muted mt-3">Last updated: October 13, 2026</p>

        <div className="mt-8 space-y-5">
          <P>
            By using AI Music Remover (the &ldquo;Service&rdquo;), you agree to these terms.
            If you do not agree, please do not use the Service.
          </P>

          <H2>What the Service is</H2>
          <P>
            AI Music Remover is a free set of browser-based audio tools — stem separation,
            vocal removal, karaoke creation, mashups, noise reduction, podcast generation,
            voice changing, transcription, and translation. All processing runs locally in
            your browser. The Service is provided <strong>&ldquo;as is,&rdquo;</strong> without
            warranties of any kind.
          </P>

          <H2>Your rights to the audio you process</H2>
          <P>
            You must own, or have the legal right to use and modify, any audio you upload,
            record, or import. Do not use the Service with copyrighted material you have no
            right to alter — for example, stripping vocals from a song you do not own and
            redistributing the result. You are solely responsible for the files you process
            and what you do with the outputs.
          </P>

          <H2>Acceptable use</H2>
          <P>You agree not to use the Service to:</P>
          <ul className="list-disc pl-6 space-y-2 text-ink/90">
            <li>
              Create misleading voice content — including impersonating a real person or
              cloning someone&apos;s voice without their clear consent (see the Voice Cloning
              page&apos;s consent requirements).
            </li>
            <li>Generate content intended to deceive, defame, harass, or scam others.</li>
            <li>Infringe copyrights, trademarks, or other intellectual property rights.</li>
            <li>Attempt to disrupt the site, its hosting, or other users&apos; access.</li>
          </ul>
          <P>
            Features marked <strong>Beta</strong> or <strong>Coming soon</strong> are provided
            for evaluation; their behavior and availability may change without notice.
          </P>

          <H2>No guarantee of output quality</H2>
          <P>
            AI processing is estimation, not perfection. Separated stems may contain faint
            traces of other instruments; transcriptions and translations may contain errors;
            voice effects are stylized. Outputs should be reviewed before any important use,
            and we make no guarantee that results will suit any particular purpose.
          </P>

          <H2>Processing limits</H2>
          <P>
            Because processing happens on your device, we recommend files of up to about
            10 minutes for AI separation; longer files may be slow or may exceed your
            device&apos;s memory. Nothing stops you from trying longer files, but performance
            is not guaranteed.
          </P>

          <H2>Limitation of liability</H2>
          <P>
            To the maximum extent permitted by law, AI Music Remover and its contributors are
            not liable for any indirect, incidental, or consequential damages arising from
            your use of the Service — including lost files, since processing happens locally
            and we never hold copies of your audio.
          </P>

          <H2>Changes</H2>
          <P>
            These terms may be updated from time to time; continued use of the Service after
            changes are posted constitutes acceptance of the updated terms.
          </P>
        </div>
      </article>
    </>
  );
}
