// Month keys are 'YYYY-MM', goal dates are 'YYYY-MM-DD' (plain calendar days,
// no time zone), everything else is epoch milliseconds.

const pad = (n) => String(n).padStart(2, '0');

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

export function isMonthKey(key) {
  return typeof key === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

/**
 * Month a freshly spun book should belong to: this month if nothing has been
 * picked for it yet, otherwise the first free month after it.
 */
export function suggestMonth(pickedBooks, now = new Date()) {
  const taken = new Set(pickedBooks.map((b) => b.month).filter(Boolean));
  let key = monthKey(now);
  for (let i = 0; i < 24 && taken.has(key); i++) key = addMonths(key, 1);
  return key;
}

export function monthLabel(key, locale) {
  if (!isMonthKey(key)) return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function monthName(key, locale) {
  if (!isMonthKey(key)) return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long' });
}

/** A few months either side of `around`, for month pickers. */
/** Months around `around`, always including `keep` (the value currently chosen). */
export function monthOptions(around = monthKey(), before = 6, after = 6, keep = null) {
  const out = [];
  for (let i = -before; i <= after; i++) out.push(addMonths(around, i));
  if (keep && isMonthKey(keep) && !out.includes(keep)) out.push(keep);
  return out.sort();
}

export function isoDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isIsoDay(s) {
  // A real calendar day: Date would quietly roll 31 February over into March.
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDay(parseDay(s)) === s;
}

export function parseDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Whole calendar days from `now` until `iso` (negative when it's past). */
export function daysUntil(iso, now = new Date()) {
  const a = parseDay(isoDay(now));
  const b = parseDay(iso);
  return Math.round((b - a) / 86400000);
}

export function shortDay(iso, locale) {
  if (!isIsoDay(iso)) return '';
  return parseDay(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function longDate(ms, locale) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
