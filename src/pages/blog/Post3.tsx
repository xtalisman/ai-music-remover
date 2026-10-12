import PostLayout, { H2, P } from './PostLayout';

export default function Post3() {
  return (
    <PostLayout
      slug="clean-noisy-recordings"
      title="How to Clean Up a Noisy Voice Recording"
      description="Practical techniques for removing hiss, hum, and room noise from voice recordings: mic technique, noise profiles, spectral gating, and when to just re-record."
      date="October 13, 2026"
      readTime="7 min"
      ctaTitle="Clean your recording now"
      ctaText="Upload the noisy audio and let spectral noise reduction do the heavy lifting — free."
      ctaLabel="Open the Noise Remover"
      ctaHref="/noise-remover"
    >
      <P>
        The room was humming, the mic was too far away, and now your podcast episode or
        voiceover is wrapped in a blanket of hiss. Before you reach for software, know
        this: <strong>the best noise reduction happens before you press record.</strong>
        What follows is the full playbook — prevention first, repair second, and an
        honest note on when repair is not worth it.
      </P>

      <H2>Get it right at the source</H2>
      <P>
        Most "noisy recording" problems are really "quiet voice" problems. Noise only
        sounds loud because the voice is too quiet relative to it. The fixes are
        unglamorous but decisive: get the microphone close (a hand's width from your
        mouth for most mics), speak up a little, and turn off what you can — fans,
        air conditioning, humming fridges, ticking clocks. A $30 mic three inches away
        in a quiet room beats a $300 mic across a noisy room every time.
      </P>
      <P>
        Record a few seconds of "silence" at the start of every session — just the room,
        no talking. This becomes your <strong>noise profile</strong>, the fingerprint
        the software uses to tell noise from voice. Build the habit and every future
        cleanup gets easier.
      </P>

      <H2>How noise reduction actually works</H2>
      <P>
        The most common technique is <strong>spectral gating</strong>. The software
        studies your room-tone sample and learns how loud the noise is at each
        frequency. Then it scans the recording frequency by frequency: where the sound
        is barely louder than the noise floor, it turns that frequency down; where
        your voice clearly dominates, it leaves it alone.
      </P>
      <P>
        That is why the intensity slider matters. Too gentle and the hiss stays. Too
        aggressive and the gate starts chewing on the quiet consonants and breathiness
        of your voice, producing a warbly, underwater artifact engineers call
        "musical noise." The right setting is the lowest one that makes the noise
        inaudible in context — always judge with the voice playing, never on the
        silence alone.
      </P>

      <H2>A cleanup workflow that works</H2>
      <P>
        <strong>1. Trim first.</strong> Cut dead air at the heads and tails; there is no
        reason to process silence you will delete anyway.
      </P>
      <P>
        <strong>2. Remove steady noise.</strong> Apply noise reduction using a clean
        room-tone section as the profile. One moderate pass beats two aggressive ones.
      </P>
      <P>
        <strong>3. Handle hum separately.</strong> Electrical hum lives at one frequency
        (and its harmonics). A narrow notch at that frequency often kills it completely
        without touching the voice.
      </P>
      <P>
        <strong>4. De-ess and level last.</strong> Only after the noise is gone should
        you compress or normalize — compression turns up the quiet parts, which means
        it turns up any noise you left behind.
      </P>

      <H2>When to re-record instead</H2>
      <P>
        Honesty time: some recordings cannot be saved. If the voice is distorted from
        clipping, if a dog barked over your key sentence, if the wind slammed the mic —
        no algorithm recovers information that was never captured. Abrupt, loud,
        irregular noises are the hardest case for every noise reducer, because they
        look exactly like the voice in the analysis.
      </P>
      <P>
        A good rule of thumb: if you can understand every word and the noise is
        <em> steady</em> (hiss, hum, fan drone), processing will likely rescue it. If
        words are missing or buried under sudden sounds, re-recording is faster than
        fighting the audio for an hour and still hating the result.
      </P>
    </PostLayout>
  );
}
