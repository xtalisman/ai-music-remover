import PostLayout, { H2, P } from './PostLayout';

export default function Post5() {
  return (
    <PostLayout
      slug="clean-up-podcast-audio-complete-guide"
      title="How to Clean Up Podcast Audio: A Complete Guide"
      description="From mic technique to noise reduction to leveling — the complete workflow for making your podcast sound professional, even in an untreated room."
      date="October 13, 2026"
      readTime="12 min"
      ctaTitle="Clean your podcast audio free"
      ctaText="Remove hiss, hum, and room noise from your episodes right in your browser."
      ctaLabel="Open the Noise Remover"
      ctaHref="/noise-remover"
    >
      <P>
        Listeners forgive a lot — rambling tangents, the occasional "um," even a mediocre
        microphone. What they don\u2019t forgive is bad audio: the hiss that makes them turn up
        the volume, the room echo that screams "recorded in a bathroom," the hum that gives
        them a headache by minute ten. Studies consistently show that audio quality is the
        number-one factor in whether someone keeps listening to a podcast. The good news:
        you don\u2019t need a treated studio. You need a workflow. Here\u2019s the complete one,
        from recording to final export.
      </P>

      <H2>Stage 1: Get it right at the source (70% of the battle)</H2>
      <P>
        Every audio engineer will tell you the same thing: you can\u2019t polish a bad recording
        into a good one. Processing helps enormously, but it works best on audio that was
        captured well. The three things that matter most:
      </P>
      <P>
        <strong>1. Microphone distance and position.</strong> Get close — 4-6 inches (10-15cm)
        from a cardioid mic. This does two magical things: your voice gets louder relative to
        the room (better signal-to-noise ratio), and the proximity effect adds pleasant warmth
        to your voice. Speak slightly off-axis (not directly into the capsule) to reduce
        plosives — those popping P and B sounds. A $20 foam windscreen or a $15 pop filter
        eliminates 90% of plosive problems.
      </P>
      <P>
        <strong>2. Kill the noise at its source.</strong> Before reaching for software, do a
        30-second room audit: turn off the air conditioner (or record between cycles), close
        windows facing streets, silence phone notifications, move the ticking clock, and ask
        housemates for 30 minutes of quiet. Put your computer\u2019s fans as far from the mic
        as possible — or record on a laptop running on battery with the fans spun down. Every
        decibel of noise you prevent is a decibel you don\u2019t have to remove later.
      </P>
      <P>
        <strong>3. Tame the room.</strong> You don\u2019t need acoustic foam panels. A bedroom with
        a bed, curtains, and a closet full of clothes sounds dramatically better than an empty
        office with hard walls — soft furnishings absorb the reflections that cause that hollow,
        "bathroom" sound. Record facing into the room\u2019s softest corner, or drape a thick
        blanket over two chairs to make a makeshift vocal booth. It looks ridiculous. It sounds
        fantastic.
      </P>

      <H2>Stage 2: Noise reduction (the cleanup pass)</H2>
      <P>
        Even with good technique, you\u2019ll have some background noise: preamp hiss, room tone,
        computer fan, distant traffic. This is where spectral noise reduction earns its keep.
        The workflow:
      </P>
      <P>
        <strong>Step 1 — Find your noise-only moment.</strong> Every recording should start with
        2-3 seconds of silence — just the room, no talking. This "room tone" is gold: it\u2019s
        the pure noise fingerprint your noise remover needs to learn what to remove. Make it
        a habit: hit record, sit silently for three seconds, then start speaking.
      </P>
      <P>
        <strong>Step 2 — Apply gentle noise reduction first.</strong> Load your audio into our
        free noise remover (or any spectral denoiser). Start with moderate intensity — you\u2019re
        aiming to make the noise inaudible, not to achieve digital silence. The tell-tale sign
        you\u2019ve gone too far: voices start sounding "underwater" or metallic, and quiet
        breaths between words get chopped unnaturally. Back off until it sounds natural.
      </P>
      <P>
        <strong>Step 3 — A/B everything.</strong> Toggle between the original and processed
        version constantly. Your ears adapt quickly to processing artifacts, so fresh comparison
        keeps you honest. If you can\u2019t hear the noise anymore but the voice sounds untouched,
        you\u2019re done. That\u2019s the entire goal.
      </P>

      <H2>Stage 3: Leveling and dynamics (the polish pass)</H2>
      <P>
        Clean audio that\u2019s too quiet in parts and too loud in others still sounds amateur.
        Two tools fix this:
      </P>
      <P>
        <strong>Compression — the great equalizer.</strong> A gentle compressor (2:1 or 3:1 ratio,
        medium attack, auto release) evens out the difference between your loud laughs and quiet
        asides. You don\u2019t need to understand compression deeply: most DAWs and editors have
        a "voice" or "podcast" preset that\u2019s 80% of the way there. The goal is consistency —
        a listener shouldn\u2019t have to ride the volume knob.
      </P>
      <P>
        <strong>Loudness normalization — match the standard.</strong> Podcasts should target
        around -16 LUFS for stereo (-19 LUFS for mono) — this is the loudness standard that
        Spotify, Apple Podcasts, and YouTube expect. Most editors have a "loudness normalize"
        function. This ensures your episode isn\u2019t jarringly quieter or louder than the
        professional shows in someone\u2019s feed.
      </P>

      <H2>Stage 4: The final 5% (EQ and de-essing)</H2>
      <P>
        <strong>High-pass filter:</strong> Cut everything below 80Hz (100Hz for most voices).
        There\u2019s no useful vocal content down there — just rumble, mic handling noise, and
        AC hum. This single move cleans up more mud than any other EQ adjustment.
      </P>
      <P>
        <strong>De-essing:</strong> If S sounds are harsh and piercing ("esss" jumping out),
        a de-esser tames just those sibilant frequencies without dulling the whole voice.
        Most editors include one; use it gently.
      </P>
      <P>
        <strong>Presence (optional):</strong> A small, wide boost around 3-5kHz can add clarity
        and "air" to a dull-sounding voice. But be conservative — 2-3dB maximum. If you recorded
        well, you may not need this at all.
      </P>

      <H2>The 10-minute emergency cleanup (when you skipped all of the above)</H2>
      <P>
        We\u2019ve all been there: a great interview recorded in a noisy café, a deadline in an
        hour, no time for the full workflow. Here\u2019s the triage version: (1) Run it through
        a noise remover at moderate intensity — this alone fixes 60% of bad recordings. (2) Apply
        a high-pass filter at 100Hz to kill rumble. (3) Normalize loudness to -16 LUFS. (4) If
        there are obvious loud/quiet sections, manually adjust clip volumes. Ten minutes,
        massive improvement. It won\u2019t sound like a studio, but it\u2019ll sound like you
        tried — and listeners respect effort.
      </P>

      <H2>Common mistakes that ruin podcast audio</H2>
      <P>
        <strong>Over-processing.</strong> The number-one beginner mistake is stacking too much
        noise reduction, too much compression, and too much EQ. Each process adds subtle
        artifacts; combined, they make voices sound robotic and fatiguing. Less is more —
        if you\u2019re not sure something helped, bypass it and compare.
      </P>
      <P>
        <strong>Recording too far from the mic.</strong> Every doubling of distance drops your
        voice 6dB relative to the room noise. That "I\u2019ll just normalize it later" plan
        amplifies the noise exactly as much as the voice. Get close to the mic. Always.
      </P>
      <P>
        <strong>Ignoring the room.</strong> A $300 microphone in an empty tile bathroom sounds
        worse than a $30 headset mic in a closet full of clothes. The room is part of your
        signal chain — treat it that way.
      </P>
      <P>
        <strong>Inconsistent levels between hosts.</strong> If one person sounds loud and clear
        and the other sounds like they\u2019re in a well, listeners will blame your show, not
        their setup. Check levels before recording, and fix imbalances in editing — your
        audience shouldn\u2019t have to work to hear everyone equally.
      </P>

      <H2>Your podcast cleanup checklist</H2>
      <P>
        Print this and tape it to your monitor: ☐ Record 3 seconds of room tone first ☐ Mic
        4-6 inches away, slightly off-axis ☐ Room audit: AC, windows, notifications, fans ☐
        Noise reduction at moderate intensity, A/B compared ☐ High-pass filter at 80-100Hz ☐
        Gentle compression for consistent levels ☐ De-ess if needed ☐ Loudness normalize to
        -16 LUFS stereo ☐ Listen on earbuds AND a phone speaker before publishing (that\u2019s
        how most people will hear it).
      </P>
      <P>
        Follow this workflow and your podcast will sound better than 90% of shows out there —
        not because you bought expensive gear, but because you treated audio quality as a
        craft. Your listeners will notice, even if they can\u2019t articulate why your show
        is the one they actually finish.
      </P>
    </PostLayout>
  );
}
