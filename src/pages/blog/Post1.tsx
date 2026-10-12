import PostLayout, { H2, P } from './PostLayout';

export default function Post1() {
  return (
    <PostLayout
      slug="how-ai-stem-separation-works"
      title="How AI Stem Separation Actually Works"
      description="A beginner-friendly tour of the technology behind AI vocal removal: spectrograms, masking, and how neural networks learn to unmix a song."
      date="October 13, 2026"
      readTime="7 min"
      ctaTitle="Try it on your own music"
      ctaText="Our separator runs the same kind of AI in your browser — free, private, no sign-up."
      ctaLabel="Open the Music Remover"
      ctaHref="/"
    >
      <P>
        Drop a finished song into a stem separator and, a minute later, you get the vocals
        on one track and the band on another — as if someone handed you the original
        studio multitrack. It feels like magic, but the process is a clever chain of
        signal processing and machine learning. Here is what is happening under the hood.
      </P>

      <H2>Step 1: Turning sound into a picture</H2>
      <P>
        A neural network cannot listen to a waveform the way you do, so the first step is
        to convert the audio into a <strong>spectrogram</strong> — essentially a photograph
        of the sound. Time runs left to right, frequency runs bottom to top, and brightness
        shows how loud each frequency is at each moment. A kick drum appears as a dark
        thump low down; a singer's vibrato shows up as a wavy bright ribbon.
      </P>
      <P>
        This picture is made with a mathematical tool called the short-time Fourier
        transform (STFT). It chops the song into tiny overlapping slices — a few
        milliseconds each — and measures the frequencies inside every slice. The result
        is a grid of numbers the network can actually work with.
      </P>

      <H2>Step 2: The network predicts a mask</H2>
      <P>
        The AI model at the heart of most separators is a neural network shaped like a
        "U" — an encoder that squeezes the spectrogram down to its essence, then a
        decoder that expands it back up. Architectures in this family (Spleeter-style
        models are a well-known example) have seen thousands of songs <em>along with
        their isolated stems</em> during training, so they have learned what a voice
        "looks like" in spectrogram-land versus a drum kit or a bass guitar.
      </P>
      <P>
        Given your song's spectrogram, the network does not generate new audio. Instead,
        for each stem it predicts a <strong>mask</strong>: a second grid of values between
        0 and 1, one per time-frequency cell, saying "how much of this little square
        belongs to the vocals." Multiply the mask by the original spectrogram and you
        keep only the vocal parts.
      </P>

      <H2>Step 3: Converting the picture back into sound</H2>
      <P>
        The masked spectrograms are turned back into waveforms with the inverse of the
        STFT. One subtlety: the network only ever saw magnitudes (brightness), not the
        exact phase (timing) of each frequency, so separators typically reuse the
        original song's phase. That works surprisingly well and keeps everything in sync.
      </P>
      <P>
        Finally, a sanity check: add the four stems back together and you should get
        almost exactly the original mix. Good separators reconstruct the song to within
        a whisper of the input — if the sum does not match the mix, something went wrong.
      </P>

      <H2>Why it sometimes struggles</H2>
      <P>
        Separation is estimation, not surgery. A few things make it harder:
      </P>
      <P>
        <strong>Frequency overlap.</strong> A piano and a guitar can occupy the same
        frequencies at the same moment; the mask has to guess, and guesses leave faint
        "ghost" traces of one instrument in another's stem.
      </P>
      <P>
        <strong>Reverb and effects.</strong> Heavy reverb smears a voice across the
        spectrogram, making its edges fuzzy. Dry, close-miked recordings separate
        far more cleanly than washed-out live recordings.
      </P>
      <P>
        <strong>Mastered loudness.</strong> Aggressively compressed masters glue
        everything together, which is the opposite of what a separator wants.
      </P>

      <H2>What "runs in your browser" means</H2>
      <P>
        Modern separators can be converted to a portable format (ONNX) and executed
        with WebAssembly — near-native code that runs inside a web page. The model
        files download once, get cached, and from then on your audio never leaves
        your device. That is why a tool like ours can be free: there are no GPU
        servers to pay for, just your own computer doing the math.
      </P>
      <P>
        The trade-off is speed. A data-center GPU might split a three-minute song in
        seconds; your laptop's CPU takes longer, and very long files need to be
        processed in chunks to fit in memory. Patience is part of the deal — but the
        price and the privacy are hard to beat.
      </P>
    </PostLayout>
  );
}
