// Geometry and timing for the spinning wheel. Angles are in degrees, measured
// clockwise from 12 o'clock, which is where the pointer sits. A wheel rotation
// of R degrees (clockwise) puts the wheel-local angle (-R mod 360) under it.

export const mod360 = (a) => ((a % 360) + 360) % 360;

/** Turn weights into consecutive [start, end) slices of the full circle. */
export function segmentAngles(weights) {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  const out = [];
  let at = 0;
  for (const w of weights) {
    const span = total > 0 ? (Math.max(0, w) / total) * 360 : 0;
    out.push({ start: at, end: at + span, mid: at + span / 2, span });
    at += span;
  }
  return out;
}

/** Index of the slice currently under the pointer, or -1 for an empty wheel. */
export function indexAtPointer(rotation, angles) {
  const local = mod360(-rotation);
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    if (a.span > 0 && local >= a.start && local < a.end) return i;
  }
  // Floating-point edge: 359.9999… belongs to the last visible slice.
  for (let i = angles.length - 1; i >= 0; i--) if (angles[i].span > 0) return i;
  return -1;
}

/**
 * Final rotation that lands the pointer inside slice `angle`, at least
 * `turns` full turns past `from`. `offset` (-0.5…0.5) moves the landing
 * point away from dead centre so it doesn't look staged.
 */
export function landingRotation(from, angle, { turns = 6, offset = 0 } = {}) {
  const inset = Math.max(-0.42, Math.min(0.42, offset));
  const localTarget = angle.mid + inset * angle.span;
  const wanted = mod360(-localTarget);
  const delta = mod360(wanted - mod360(from));
  return from + turns * 360 + delta;
}

/** Uniform random integer in [0, n) using the crypto RNG when available. */
export function randomIndex(n, rng = cryptoRandom) {
  if (n <= 0) return -1;
  return Math.min(n - 1, Math.floor(rng() * n));
}

export function cryptoRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}

/** Long, satisfying deceleration: quick start, a long gentle tail. */
export function spinEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 4.2);
}

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Merge the previous on-screen slices with the next item list so removed
 * books can shrink away in place and new ones grow in. Returns entries of
 * `{ id, item, from, to }` where from/to are weights (0 or 1).
 */
export function mergeLayout(prev, nextItems) {
  const nextById = new Map(nextItems.map((i) => [i.id, i]));
  const merged = prev
    .filter((p) => nextById.has(p.id) || (p.weight ?? p.to) > 0)
    .map((p) =>
      nextById.has(p.id)
        ? { id: p.id, item: nextById.get(p.id), from: p.weight ?? p.to, to: 1 }
        : { id: p.id, item: p.item, from: p.weight ?? p.to, to: 0 },
    );
  // New books slot in right after the book that precedes them in the new order.
  let after = -1;
  for (const it of nextItems) {
    const at = merged.findIndex((m) => m.id === it.id);
    if (at >= 0) {
      after = at;
      continue;
    }
    merged.splice(after + 1, 0, { id: it.id, item: it, from: 0, to: 1 });
    after += 1;
  }
  return merged;
}

/** Largest font size (px) that fits a label inside a slice. */
export function labelFontSize(spanDeg, radius, { min = 7, max = 17 } = {}) {
  const arc = (spanDeg * Math.PI) / 180 * radius * 0.62;
  return Math.max(min, Math.min(max, arc / 2.5));
}

/** Trim `text` so roughly `maxWidth` px of it fits at `fontSize`. */
export function fitText(text, fontSize, maxWidth, widthFactor = 0.54) {
  const s = String(text ?? '');
  const maxChars = Math.max(3, Math.floor(maxWidth / (fontSize * widthFactor)));
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 1).trimEnd() + '…';
}
