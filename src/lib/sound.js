// Tiny synthesized sounds for the wheel (no audio files needed).
let ctx = null;

function audio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a click handler so browsers allow audio later in the spin. */
export function unlockAudio() {
  audio();
}

let lastTick = 0;
export function tick(strength = 1) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastTick < 0.028) return;
  lastTick = t;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 500;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2100, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.035);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.09 * Math.max(0.3, Math.min(1, strength)), t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

/** A short bell arpeggio for the reveal. */
export function chime() {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    const t = t0 + i * 0.085;
    for (const [type, mult, vol] of [
      ['sine', 1, 0.11],
      ['triangle', 2, 0.03],
    ]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2 - i * 0.1);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1.3);
    }
  });
}
