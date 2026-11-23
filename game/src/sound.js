// Kitchen sounds, synthesised live with WebAudio: no audio files, no network.
// Every blip is an oscillator with a quick envelope, tuned to feel like a card
// snapping onto the table, a bubble popping, or a little victory jig.
let context = null;
let muted = false;

function ensureContext() {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!context) {
    try {
      context = new window.AudioContext();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function blip(freq, when, dur, type, gain) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
  amp.gain.setValueAtTime(0.0001, ctx.currentTime + when);
  amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + dur + 0.05);
}

/** A card snapping down: two quick thocks. */
export function playCardSound() {
  blip(220, 0, 0.08, 'triangle', 0.18);
  blip(330, 0.05, 0.1, 'triangle', 0.14);
}

/** A bubble popping when a turn ends. */
export function endTurnSound() {
  blip(180, 0, 0.12, 'sine', 0.12);
  blip(90, 0.08, 0.16, 'sine', 0.1);
}

/** A happy little jig for winning. */
export function winSound() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.12, 0.22, 'triangle', 0.16));
}

/** A sad slide downwards for losing. */
export function loseSound() {
  [392, 330, 262, 196].forEach((f, i) => blip(f, i * 0.14, 0.24, 'sawtooth', 0.06));
}

/** A soft click for selecting a card. */
export function selectSound() {
  blip(440, 0, 0.05, 'sine', 0.08);
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
