import { describe, expect, it, vi } from 'vitest';
import { addMonths, daysUntil, isIsoDay, isMonthKey, monthKey, suggestMonth } from '../../src/lib/dates.js';
import { GENRES, genreById, guessGenre } from '../../src/lib/genres.js';
import { fromGoogle, fromOpenLibrary, mergeResults, safeImageUrl, searchBooks } from '../../src/lib/covers.js';
import { translate } from '../../src/lib/i18n.svelte.js';
import { de, en } from '../../src/lib/strings.js';

describe('dates', () => {
  it('builds and shifts month keys across year boundaries', () => {
    expect(monthKey(new Date(2026, 8, 28))).toBe('2026-09');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isIsoDay('2026-10-10')).toBe(true);
    expect(isIsoDay('10.10.2026')).toBe(false);
  });

  it('suggests this month, or the next free one', () => {
    const now = new Date(2026, 8, 28);
    expect(suggestMonth([], now)).toBe('2026-09');
    expect(suggestMonth([{ month: '2026-09' }], now)).toBe('2026-10');
    expect(suggestMonth([{ month: '2026-09' }, { month: '2026-10' }, { month: '2026-08' }], now)).toBe('2026-11');
  });

  it('counts calendar days', () => {
    const now = new Date(2026, 9, 5, 23, 30);
    expect(daysUntil('2026-10-05', now)).toBe(0);
    expect(daysUntil('2026-10-10', now)).toBe(5);
    expect(daysUntil('2026-10-01', now)).toBe(-4);
  });
});

describe('genres', () => {
  it('has the twelve club genres', () => {
    expect(GENRES.map((g) => g.label)).toEqual([
      'Fantasy',
      'Romantasy',
      'Romance',
      'Dark Romance',
      'Sci-Fi',
      'Historical Fiction',
      'Thriller/Mystery',
      'Horror',
      'Non-Fiction',
      'Young Adult',
      'LGBTQ+',
      'Literary Fiction',
    ]);
    expect(new Set(GENRES.map((g) => g.id)).size).toBe(12);
  });

  it('falls back gracefully for unknown ids', () => {
    expect(genreById('poetry').label).toBe('poetry');
  });

  it('guesses genres from catalogue categories', () => {
    expect(guessGenre(['Fiction / Fantasy / Epic'])).toBe('fantasy');
    expect(guessGenre(['Fiction / Science Fiction / Space Opera'])).toBe('sci-fi');
    expect(guessGenre(['Fiction / Romance / Fantasy'])).toBe('fantasy');
    expect(guessGenre(['Fiction / Romance / Contemporary'])).toBe('romance');
    expect(guessGenre(['Young Adult Fiction / Fantasy'])).toBe('young-adult');
    expect(guessGenre(['Fiction / Thrillers / Suspense'])).toBe('thriller-mystery');
    expect(guessGenre(['Fiction / Historical / General'])).toBe('historical-fiction');
    expect(guessGenre(['Biography & Autobiography'])).toBe('non-fiction');
    expect(guessGenre(['Fiction / LGBTQ+ / Gay'])).toBe('lgbtq');
    expect(guessGenre(['Fiction'])).toBe('literary-fiction');
    expect(guessGenre([])).toBeNull();
  });
});

describe('cover helpers', () => {
  it('accepts only safe image urls', () => {
    expect(safeImageUrl('http://books.google.com/x?id=1')).toBe('https://books.google.com/x?id=1');
    expect(safeImageUrl('https://covers.openlibrary.org/b/id/1-L.jpg')).toBe('https://covers.openlibrary.org/b/id/1-L.jpg');
    expect(safeImageUrl('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeImageUrl('data:text/html;base64,AAAA')).toBeNull();
    expect(safeImageUrl('https://x.y/"onerror="')).toBeNull();
  });

  it('normalises Google and Open Library results and prefers ones with covers', () => {
    const g = fromGoogle({
      volumeInfo: {
        title: 'Babel',
        authors: ['R. F. Kuang'],
        pageCount: 560,
        categories: ['Fiction / Fantasy'],
        imageLinks: { thumbnail: 'http://books.google.com/books/content?id=1&zoom=1&edge=curl' },
      },
    });
    expect(g).toMatchObject({ title: 'Babel', author: 'R. F. Kuang', pageCount: 560 });
    expect(g.coverUrl).toBe('https://books.google.com/books/content?id=1&zoom=1');

    const ol = fromOpenLibrary({ title: 'Babel', author_name: ['R.F. Kuang'], cover_i: 42 });
    const noCover = fromOpenLibrary({ title: 'Other', author_name: ['X'] });
    const merged = mergeResults([{ ...g, coverUrl: null }, noCover], [ol]);
    expect(merged[0].title).toBe('Babel');
    expect(merged[0].coverUrl).toContain('/b/id/42-L.jpg');
    expect(merged).toHaveLength(2);
  });

  it('survives one failing source', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('googleapis')) throw new Error('429');
      return { ok: true, json: async () => ({ docs: [{ title: 'Dune', author_name: ['Frank Herbert'], cover_i: 7 }] }) };
    });
    const r = await searchBooks('dune', { fetchImpl });
    expect(r).toHaveLength(1);
    expect(r[0].author).toBe('Frank Herbert');
    expect(await searchBooks('d', { fetchImpl })).toEqual([]);
  });
});

describe('strings', () => {
  it('German and English define the same keys', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it('interpolates and pluralises', () => {
    expect(translate('de', 'wheel.count', { n: 1 })).toBe('1 Buch im Rad');
    expect(translate('de', 'wheel.count', { n: 3 })).toBe('3 Bücher im Rad');
    expect(translate('en', 'club.joinTitle', { club: 'Seitenspringer' })).toBe('Join Seitenspringer');
    expect(translate('de', 'missing.key')).toBe('missing.key');
  });
});
