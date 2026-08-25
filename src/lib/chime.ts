/**
 * Interval chime sound — a soft two-tone "ding-dong" synthesized with the Web Audio API.
 * Kept in one place so the sound can be reused and tweaked from a single constant block.
 */

export const CHIME_TONES = [
  { frequency: 880, startOffset: 0, duration: 1.1 }, // A5
  { frequency: 1318.5, startOffset: 0.16, duration: 1.2 }, // E6
];

export const CHIME_PEAK_GAIN = 0.22;
export const CHIME_ATTACK_SECONDS = 0.012;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    audioContext = new Ctor();
  }
  return audioContext;
}

/** Resume the shared AudioContext — must be called from a user gesture on mobile browsers. */
export async function unlockAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

export function playChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const now = ctx.currentTime;

  for (const tone of CHIME_TONES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(tone.frequency, now + tone.startOffset);

    const start = now + tone.startOffset;
    const end = start + tone.duration;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(CHIME_PEAK_GAIN, start + CHIME_ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
