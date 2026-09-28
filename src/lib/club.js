// Small helpers shared by both backends and the UI.

// No 0/O, 1/I/L — easy to read aloud and type from a phone.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeInviteCode(rng = cryptoRandom) {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}

/** Accepts "abcd efgh", "ABCDEFGH", "abcd-efgh" … and returns "ABCD-EFGH". */
export function normalizeCode(input) {
  const raw = String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 8) return raw;
  return raw.slice(0, 4) + '-' + raw.slice(4);
}

function cryptoRandom() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export const MEMBER_COLORS = [
  '#b2456e',
  '#23708a',
  '#d27a24',
  '#5b4a9e',
  '#3f7a57',
  '#c1902f',
  '#8a5a2b',
  '#2f8f83',
  '#d96a86',
  '#34445a',
];

/** First colour nobody in the club is using yet. */
export function pickMemberColor(members = []) {
  const used = new Set(members.map((m) => m.color));
  return MEMBER_COLORS.find((c) => !used.has(c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length];
}

export function initials(name) {
  const parts = String(name ?? '?').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = [...parts[0]][0] ?? '?';
  const second = parts.length > 1 ? [...parts.at(-1)][0] : '';
  return (first + second).toUpperCase();
}

export const cleanText = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** The fields a book document may carry, trimmed to the sizes the rules allow. */
export function cleanBookInput(input) {
  const out = {
    title: cleanText(input.title, 200),
    author: cleanText(input.author, 200),
    genre: cleanText(input.genre, 40),
    coverUrl: input.coverUrl || null,
    pageCount: Number.isInteger(input.pageCount) && input.pageCount > 0 ? Math.min(input.pageCount, 20000) : null,
  };
  return out;
}
