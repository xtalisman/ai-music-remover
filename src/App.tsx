import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Tool pages are code-split: each loads only when visited.
const VocalRemoverPage = lazy(() => import('./pages/VocalRemoverPage'));
const AudioSplitterPage = lazy(() => import('./pages/AudioSplitterPage'));
const KaraokeMakerPage = lazy(() => import('./pages/KaraokeMakerPage'));
const MashupMakerPage = lazy(() => import('./pages/MashupMakerPage'));
const NoiseRemoverPage = lazy(() => import('./pages/NoiseRemoverPage'));
const PodcastMakerPage = lazy(() => import('./pages/PodcastMakerPage'));
const VoiceChangerPage = lazy(() => import('./pages/VoiceChangerPage'));
const VoiceCloningPage = lazy(() => import('./pages/VoiceCloningPage'));
const AudioToTextPage = lazy(() => import('./pages/AudioToTextPage'));
const AudioTranslatorPage = lazy(() => import('./pages/AudioTranslatorPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const BlogPost1 = lazy(() => import('./pages/blog/Post1'));
const BlogPost2 = lazy(() => import('./pages/blog/Post2'));
const BlogPost3 = lazy(() => import('./pages/blog/Post3'));

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-muted">Loading…</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vocal-remover" element={<VocalRemoverPage />} />
            <Route path="/audio-splitter" element={<AudioSplitterPage />} />
            <Route path="/karaoke-maker" element={<KaraokeMakerPage />} />
            <Route path="/ai-mashup-maker" element={<MashupMakerPage />} />
            <Route path="/noise-remover" element={<NoiseRemoverPage />} />
            <Route path="/ai-podcast-maker" element={<PodcastMakerPage />} />
            <Route path="/voice-changer" element={<VoiceChangerPage />} />
            <Route path="/voice-cloning" element={<VoiceCloningPage />} />
            <Route path="/ai-audio-to-text" element={<AudioToTextPage />} />
            <Route path="/ai-audio-translator" element={<AudioTranslatorPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/how-ai-stem-separation-works" element={<BlogPost1 />} />
            <Route path="/blog/make-karaoke-track-at-home" element={<BlogPost2 />} />
            <Route path="/blog/clean-noisy-recordings" element={<BlogPost3 />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
