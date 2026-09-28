import { daysUntil, isoDay } from './dates.js';

export const progressId = (bookId, uid) => `${bookId}_${uid}`;

const validGoal = (g) =>
  !!g && typeof g.id === 'string' && typeof g.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && Number.isInteger(g.page);

/** Goals by date, skipping malformed or duplicate entries (the list is shared data). */
export function sortGoals(goals) {
  const seen = new Set();
  return (Array.isArray(goals) ? goals : [])
    .filter((g) => validGoal(g) && !seen.has(g.id) && seen.add(g.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.page - b.page);
}

/** The first goal due today or later. */
export function nextGoal(goals, now = new Date()) {
  const today = isoDay(now);
  return sortGoals(goals).find((g) => g.date >= today) ?? null;
}

/** The most recent goal whose date has already passed. */
export function lastPassedGoal(goals, now = new Date()) {
  const today = isoDay(now);
  const past = sortGoals(goals).filter((g) => g.date < today);
  return past.at(-1) ?? null;
}

/**
 * Where a reader stands against the club's goals.
 *  finished – marked the book as read
 *  behind   – a goal date has passed and they haven't reached its page
 *  reached  – already at or past the next goal's page
 *  open     – working towards the next goal
 *  none     – no goals to measure against
 */
export function readerGoalState(entry, goals, now = new Date()) {
  const page = entry?.page ?? 0;
  if (entry?.finished) return { state: 'finished', goal: null, pagesLeft: 0, daysLeft: null };
  const passed = lastPassedGoal(goals, now);
  if (passed && page < passed.page) {
    return { state: 'behind', goal: passed, pagesLeft: passed.page - page, daysLeft: daysUntil(passed.date, now) };
  }
  const next = nextGoal(goals, now);
  if (!next) return { state: 'none', goal: null, pagesLeft: 0, daysLeft: null };
  const daysLeft = daysUntil(next.date, now);
  if (page >= next.page) return { state: 'reached', goal: next, pagesLeft: 0, daysLeft };
  return { state: 'open', goal: next, pagesLeft: next.page - page, daysLeft };
}

export function percent(page, pageCount, finished = false) {
  if (finished) return 100;
  if (!pageCount || pageCount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((page / pageCount) * 100)));
}

export function clampPage(value, pageCount) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return pageCount > 0 ? Math.min(n, pageCount) : Math.min(n, 20000);
}

/**
 * Rating status of one book, as seen by `viewerId`.
 *
 * Ratings and reviews are revealed to you once you've rated the book yourself,
 * so nobody spoils it for you — nobody has to wait for the whole club.
 * `complete` says whether everyone expected has rated (the average is final):
 * everyone who was already in the club when the book was picked, plus anyone
 * who joined later but rated anyway.
 */
export function ratingSummary(book, members, progress, viewerId = null) {
  const entries = progress.filter((p) => p.bookId === book.id);
  const rated = entries.filter((p) => Number.isInteger(p.rating) && p.rating >= 1 && p.rating <= 5);
  const ratedIds = new Set(rated.map((p) => p.uid));
  const pickedAt = book.pickedAt ?? Infinity;
  const expected = members.filter((m) => (m.joinedAt ?? 0) <= pickedAt || ratedIds.has(m.id));
  const expectedIds = new Set(expected.map((m) => m.id));
  for (const id of ratedIds) expectedIds.add(id);

  const pending = expected.filter((m) => !ratedIds.has(m.id));
  const complete = expectedIds.size > 0 && pending.length === 0;
  const sum = rated.reduce((s, p) => s + p.rating, 0);
  const average = rated.length ? Math.round((sum / rated.length) * 10) / 10 : null;

  return {
    complete,
    revealed: viewerId != null && ratedIds.has(viewerId),
    average,
    ratedCount: rated.length,
    expectedCount: expectedIds.size,
    pending,
    ratings: rated,
    finishedCount: entries.filter((p) => p.finished).length,
  };
}

/** Per-star fill (0…1) for a 5-star display of `value`. */
export function starFills(value, stars = 5) {
  const v = Math.max(0, Math.min(stars, Number(value) || 0));
  return Array.from({ length: stars }, (_, i) => Math.max(0, Math.min(1, v - i)));
}
