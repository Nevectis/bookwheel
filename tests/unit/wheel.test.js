import { describe, expect, it } from 'vitest';
import {
  fitText,
  indexAtPointer,
  labelFontSize,
  landingRotation,
  mergeLayout,
  mod360,
  randomIndex,
  segmentAngles,
  spinEase,
} from '../../src/lib/wheel.js';

describe('segmentAngles', () => {
  it('splits the circle evenly for equal weights', () => {
    const a = segmentAngles([1, 1, 1, 1]);
    expect(a.map((s) => s.start)).toEqual([0, 90, 180, 270]);
    expect(a.at(-1).end).toBe(360);
  });

  it('gives zero-weight slices no span', () => {
    const a = segmentAngles([1, 0, 1]);
    expect(a[1].span).toBe(0);
    expect(a[2].start).toBe(180);
  });

  it('handles an empty wheel', () => {
    expect(segmentAngles([])).toEqual([]);
    expect(segmentAngles([0, 0]).every((s) => s.span === 0)).toBe(true);
  });
});

describe('indexAtPointer / landingRotation', () => {
  it('finds the slice at 12 o’clock for a given rotation', () => {
    const a = segmentAngles([1, 1, 1, 1]);
    expect(indexAtPointer(0, a)).toBe(0);
    expect(indexAtPointer(-100, a)).toBe(1); // local angle 100°
    expect(indexAtPointer(90, a)).toBe(3); // local angle 270°
  });

  it('always lands on the chosen slice, from any start, with any offset', () => {
    for (const n of [1, 2, 3, 7, 12, 40]) {
      const a = segmentAngles(Array(n).fill(1));
      for (let i = 0; i < n; i++) {
        for (const from of [0, 17.5, 359, 1234.25, -80]) {
          for (const offset of [-0.49, -0.2, 0, 0.3, 0.49]) {
            const r = landingRotation(from, a[i], { turns: 5, offset });
            expect(indexAtPointer(r, a)).toBe(i);
            expect(r - from).toBeGreaterThanOrEqual(5 * 360);
            expect(r - from).toBeLessThan(6 * 360);
          }
        }
      }
    }
  });

  it('mod360 is always in [0, 360)', () => {
    expect(mod360(-1)).toBe(359);
    expect(mod360(720)).toBe(0);
  });
});

describe('randomIndex', () => {
  it('stays in range, including rng edge values', () => {
    expect(randomIndex(5, () => 0)).toBe(0);
    expect(randomIndex(5, () => 0.9999999)).toBe(4);
    expect(randomIndex(0)).toBe(-1);
    for (let i = 0; i < 200; i++) {
      const v = randomIndex(3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
    }
  });
});

describe('spinEase', () => {
  it('starts at 0, ends at 1 and never goes backwards', () => {
    expect(spinEase(0)).toBe(0);
    expect(spinEase(1)).toBe(1);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = spinEase(t);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });
});

describe('mergeLayout', () => {
  const item = (id) => ({ id });

  it('grows new books in and keeps order', () => {
    const m = mergeLayout([], [item('a'), item('b')]);
    expect(m.map((e) => [e.id, e.from, e.to])).toEqual([
      ['a', 0, 1],
      ['b', 0, 1],
    ]);
  });

  it('shrinks removed books in place', () => {
    const prev = [
      { id: 'a', item: item('a'), weight: 1, to: 1 },
      { id: 'b', item: item('b'), weight: 1, to: 1 },
      { id: 'c', item: item('c'), weight: 1, to: 1 },
    ];
    const m = mergeLayout(prev, [item('a'), item('c')]);
    expect(m.map((e) => [e.id, e.to])).toEqual([
      ['a', 1],
      ['b', 0],
      ['c', 1],
    ]);
  });

  it('drops slices that have fully shrunk and inserts new ones after their predecessor', () => {
    const prev = [
      { id: 'a', item: item('a'), weight: 1, to: 1 },
      { id: 'gone', item: item('gone'), weight: 0, to: 0 },
      { id: 'c', item: item('c'), weight: 1, to: 1 },
    ];
    const m = mergeLayout(prev, [item('a'), item('new'), item('c')]);
    expect(m.map((e) => e.id)).toEqual(['a', 'new', 'c']);
  });

  it('continues a tween from the current weight', () => {
    const prev = [{ id: 'a', item: item('a'), weight: 0.4, to: 0 }];
    const m = mergeLayout(prev, [item('a')]);
    expect(m[0]).toMatchObject({ from: 0.4, to: 1 });
  });
});

describe('label fitting', () => {
  it('shrinks font for thin slices within bounds', () => {
    expect(labelFontSize(180, 230)).toBe(17);
    expect(labelFontSize(3, 230)).toBe(7);
  });

  it('truncates long titles with an ellipsis', () => {
    expect(fitText('Short', 12, 200)).toBe('Short');
    const long = fitText('The Unbearable Lightness of Being and Other Stories', 14, 120);
    expect(long.endsWith('…')).toBe(true);
    expect(long.length).toBeLessThan(20);
  });
});
