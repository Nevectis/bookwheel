import { describe, expect, it } from 'vitest';
import {
  clampPage,
  lastPassedGoal,
  nextGoal,
  percent,
  ratingSummary,
  readerGoalState,
  starFills,
} from '../../src/lib/reading.js';

const now = new Date(2026, 9, 5); // 5 Oct 2026
const goals = [
  { id: 'g2', date: '2026-10-10', page: 50 },
  { id: 'g1', date: '2026-10-01', page: 20 },
  { id: 'g3', date: '2026-10-20', page: 150 },
];

describe('goals', () => {
  it('finds the next and last passed goal', () => {
    expect(nextGoal(goals, now).id).toBe('g2');
    expect(lastPassedGoal(goals, now).id).toBe('g1');
    expect(nextGoal(goals, new Date(2026, 9, 10)).id).toBe('g2'); // due today still counts
    expect(nextGoal(goals, new Date(2026, 10, 1))).toBeNull();
  });

  it('classifies readers', () => {
    expect(readerGoalState({ page: 10 }, goals, now)).toMatchObject({ state: 'behind', pagesLeft: 10 });
    expect(readerGoalState({ page: 30 }, goals, now)).toMatchObject({ state: 'open', pagesLeft: 20, daysLeft: 5 });
    expect(readerGoalState({ page: 60 }, goals, now)).toMatchObject({ state: 'reached' });
    expect(readerGoalState({ page: 1, finished: true }, goals, now).state).toBe('finished');
    expect(readerGoalState({ page: 1 }, [], now).state).toBe('none');
    expect(readerGoalState(undefined, goals, now)).toMatchObject({ state: 'behind', pagesLeft: 20 });
  });
});

describe('progress helpers', () => {
  it('computes percentages safely', () => {
    expect(percent(50, 200)).toBe(25);
    expect(percent(500, 200)).toBe(100);
    expect(percent(10, 0)).toBe(0);
    expect(percent(10, null, true)).toBe(100);
  });

  it('clamps page input', () => {
    expect(clampPage('42', 300)).toBe(42);
    expect(clampPage(400, 300)).toBe(300);
    expect(clampPage(-3, 300)).toBe(0);
    expect(clampPage('abc', 300)).toBe(0);
    expect(clampPage(12.7, 0)).toBe(12);
  });
});

describe('ratingSummary', () => {
  const book = { id: 'b1', pickedAt: 1000 };
  const members = [
    { id: 'anna', name: 'Anna', joinedAt: 100 },
    { id: 'ben', name: 'Ben', joinedAt: 200 },
    { id: 'late', name: 'Late', joinedAt: 5000 },
  ];

  it('reveals ratings only to people who have rated themselves', () => {
    const progress = [{ bookId: 'b1', uid: 'anna', rating: 5 }];
    const forAnna = ratingSummary(book, members, progress, 'anna');
    const forBen = ratingSummary(book, members, progress, 'ben');
    const forNobody = ratingSummary(book, members, progress);
    expect(forAnna.revealed).toBe(true);
    expect(forBen.revealed).toBe(false);
    expect(forNobody.revealed).toBe(false);
    // not everyone has to rate first
    expect(forAnna.complete).toBe(false);
    expect(forAnna.average).toBe(5);
    expect(forAnna.ratedCount).toBe(1);
    expect(forAnna.expectedCount).toBe(2);
    expect(forBen.pending.map((m) => m.id)).toEqual(['ben']);
  });

  it('reports no average before anyone has rated', () => {
    const s = ratingSummary(book, members, [{ bookId: 'b1', uid: 'anna', page: 20 }], 'anna');
    expect(s.average).toBeNull();
    expect(s.revealed).toBe(false);
  });

  it('marks the average final once everyone expected has rated', () => {
    const s = ratingSummary(book, members, [
      { bookId: 'b1', uid: 'anna', rating: 5 },
      { bookId: 'b1', uid: 'ben', rating: 4 },
      { bookId: 'other', uid: 'ben', rating: 1 },
    ]);
    expect(s.complete).toBe(true);
    expect(s.average).toBe(4.5);
  });

  it('counts late joiners who chose to rate, and people who left', () => {
    const s = ratingSummary(book, members, [
      { bookId: 'b1', uid: 'anna', rating: 3 },
      { bookId: 'b1', uid: 'ben', rating: 4 },
      { bookId: 'b1', uid: 'late', rating: 5 },
      { bookId: 'b1', uid: 'former', rating: 2 },
    ]);
    expect(s.complete).toBe(true);
    expect(s.expectedCount).toBe(4);
    expect(s.average).toBe(3.5);
  });

  it('ignores progress without a valid rating', () => {
    const s = ratingSummary(book, members, [
      { bookId: 'b1', uid: 'anna', rating: null, finished: true },
      { bookId: 'b1', uid: 'ben', rating: 9 },
    ]);
    expect(s.ratedCount).toBe(0);
    expect(s.finishedCount).toBe(1);
    expect(s.complete).toBe(false);
  });
});

describe('starFills', () => {
  it('fills whole and partial stars', () => {
    expect(starFills(4)).toEqual([1, 1, 1, 1, 0]);
    expect(starFills(3.5).map((v) => Math.round(v * 10) / 10)).toEqual([1, 1, 1, 0.5, 0]);
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(9)).toEqual([1, 1, 1, 1, 1]);
  });
});
