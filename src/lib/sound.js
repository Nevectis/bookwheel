// Small synthesized sounds for the wheel (no audio files needed): a soft paper
// "tick" as the ribbon brushes each slice, and a music-box chime for the reveal.
let ctx = null;
let noise = null;

function audio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(c) {
  if (noise) return noise;
  noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  return noise;
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
  if (t - lastTick < 0.03) return;
  lastTick = t;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2400 + Math.random() * 500;
  band.Q.value = 1.4;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.18 * Math.max(0.35, Math.min(1, strength)), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  src.connect(band).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + 0.05);
}

/** A gentle music-box phrase for the reveal. */
export function chime() {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.03;
  [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => {
    const t = t0 + i * 0.16;
    for (const [mult, vol] of [
      [1, 0.07],
      [3.01, 0.012],
      [5.4, 0.005],
    ]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 - i * 0.15);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1.7);
    }
  });
}
