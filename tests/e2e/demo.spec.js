// End-to-end walk through the user story against the demo (localStorage) backend.
import { expect, test } from '@playwright/test';
import { stubCatalogue, wheelCount } from './helpers.js';

const GENRE_LABELS = [
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
];

function isoInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function enterDemo(page, name = 'Niels') {
  await page.goto('/');
  await page.getByTestId('demo-name').fill(name);
  await page.getByTestId('demo-start').click();
  await expect(page.locator('#wheel')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await stubCatalogue(page, [
    {
      title: 'Piranesi',
      authors: ['Susanna Clarke'],
      pageCount: 272,
      categories: ['Fiction / Fantasy / Contemporary'],
      imageLinks: { thumbnail: 'http://books.google.com/books/content?id=pira&zoom=1&edge=curl' },
    },
  ]);
});

test('the whole book-club loop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enterDemo(page);
  await expect(wheelCount(page)).toHaveText(/12 Bücher im Rad/);

  // ── Add a book to the shelf via lookup (title, author, genre, cover) ──
  await page.getByTestId('add-book').click();
  await page.getByTestId('lookup').fill('Piranesi');
  await page.getByTestId('lookup-results').getByRole('button', { name: /Piranesi/ }).click();
  await expect(page.getByTestId('book-title')).toHaveValue('Piranesi');
  await expect(page.getByTestId('book-author')).toHaveValue('Susanna Clarke');
  await expect(page.getByTestId('book-pages')).toHaveValue('272');
  await expect(page.getByRole('radio', { name: 'Fantasy' })).toBeChecked();
  await page.getByTestId('book-submit').click();
  await expect(page.getByText('„Piranesi“ steht jetzt im Regal!')).toBeVisible();
  const shelfBook = page.getByTestId('shelf').locator('li', { hasText: 'Piranesi' });
  await expect(shelfBook).toBeVisible();
  await expect(shelfBook.locator('img.loaded')).toHaveCount(1);
  // …and it is on the wheel too
  await expect(wheelCount(page)).toHaveText(/13 Bücher im Rad/);

  // ── The wheel shows title + author, never the genre ──
  // wait until the new slice has fully grown in (the author line appears last)
  await expect(page.locator('.wheel-wrap svg text', { hasText: 'Susanna Clarke' })).toHaveCount(1);
  const wheelTexts = await page.locator('.wheel-wrap svg text').allTextContents();
  expect(wheelTexts).toContain('Piranesi');
  expect(wheelTexts).toContain('Susanna Clarke');
  for (const label of GENRE_LABELS) expect(wheelTexts).not.toContain(label);

  // ── Filter by genre ──
  await page.locator('.fchip', { hasText: 'Fantasy' }).click();
  await expect(wheelCount(page)).toHaveText(/2 Bücher im Rad/);

  // ── Spin (full animation) ──
  await page.getByTestId('spin').click();
  await expect(page.getByText('Gerade lest ihr „Fourth Wing“')).toBeVisible();
  await page.getByTestId('confirm-yes').click();
  const result = page.getByTestId('spin-result');
  await expect(result).toBeVisible({ timeout: 15_000 });
  const picked = (await result.locator('#result-title').textContent()).trim();
  expect(['Babel', 'Piranesi']).toContain(picked);
  await expect(result).toContainText('Fantasy'); // genre shown in the popup
  await expect(result).toContainText(picked === 'Babel' ? 'R. F. Kuang' : 'Susanna Clarke');
  await expect(page.getByTestId('result-month')).toHaveValue(/-\d\d$/);
  await page.getByTestId('result-start').click();
  await expect(result).toBeHidden();

  // Removed from the wheel & shelf, now the current book, listed for its month
  await expect(wheelCount(page)).toHaveText(/1 Buch im Rad/);
  await expect(page.getByTestId('shelf')).not.toContainText(picked);
  await expect(page.locator('#current-title')).toHaveText(picked);
  const entry = page.getByTestId('chronicle-entry').filter({ hasText: picked });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText('Lesen wir gerade');

  // ── Reading goal: by date X everyone reaches page 50 ──
  await page.getByTestId('add-goal').click();
  await page.getByTestId('goal-date').fill(isoInDays(7));
  await page.getByTestId('goal-page').fill('50');
  await page.locator('.g-form').getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('.goal')).toHaveCount(1);
  await expect(page.locator('.goal')).toContainText('Seite 50');
  await expect(page.locator('.next-goal')).toContainText('Seite 50');

  // ── Progress update shows in the ticker under the wheel ──
  await page.getByTestId('page-input').fill('40');
  await page.getByTestId('page-input').press('Enter');
  const me = page.getByTestId('ticker').locator('li', { hasText: 'Niels' });
  await expect(me).toContainText('S. 40');
  await expect(me).toContainText(picked);
  await expect(me).toContainText('noch 10 S. bis zum Ziel');
  await expect(page.getByTestId('ticker').locator('li')).toHaveCount(5);

  // ── Mark as read → optional rating ──
  await page.getByTestId('mark-read').click();
  const review = page.getByTestId('review-modal');
  await expect(review).toContainText('Geschafft!');
  await review.getByRole('button', { name: 'Später bewerten' }).click();
  await expect(page.locator('#current')).toContainText('Gelesen');
  await expect(me).toContainText('fertig!');
  await page.getByTestId('rate-now').click();
  await page.getByRole('radio', { name: '4 Sterne' }).click();
  await page.getByTestId('review-text').fill('Wunderschön und seltsam.');
  await page.getByTestId('review-submit').click();
  await expect(page.getByText('Danke für deine Bewertung!')).toBeVisible();
  await expect(entry).toContainText('1 von 5 Bewertungen'); // sealed until everyone rated

  // ── Last missing rating reveals the average (4+5+3+4+5)/5 = 4.2 ──
  const goneGirl = page.getByTestId('chronicle-entry').filter({ hasText: 'Gone Girl' });
  await expect(goneGirl).toContainText('Es fehlt noch: du');
  await goneGirl.getByTestId('chron-rate').click();
  await page.getByRole('radio', { name: '5 Sterne' }).click();
  await page.getByTestId('review-submit').click();
  await expect(goneGirl.getByTestId('avg-rating')).toContainText('4,2');
  await goneGirl.getByRole('button', { name: 'Rezensionen lesen' }).click();
  await expect(goneGirl).toContainText('Der Twist in der Mitte!!');

  // ── Spinning again and putting the book back (undo) ──
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.fchip', { hasText: 'Alle Genres' }).click();
  await expect(wheelCount(page)).toHaveText(/12 Bücher im Rad/);
  await page.getByTestId('spin').click();
  await page.getByTestId('confirm-yes').click();
  await expect(result).toBeVisible({ timeout: 10_000 });
  const second = (await result.locator('#result-title').textContent()).trim();
  await result.getByRole('button', { name: 'Zurück ins Regal' }).click();
  await expect(page.getByText(`„${second}“ steht wieder im Regal.`)).toBeVisible();
  await expect(page.locator('#current-title')).toHaveText(picked);
  await expect(wheelCount(page)).toHaveText(/12 Bücher im Rad/);

  // ── Everything survives a reload ──
  await page.reload();
  await expect(page.locator('#current-title')).toHaveText(picked);
  await expect(page.getByTestId('ticker').locator('li', { hasText: 'Niels' })).toContainText('fertig!');

  expect(errors).toEqual([]);
});

test('switches language and theme', async ({ page }) => {
  await enterDemo(page);
  await page.getByTestId('user-menu').click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('#wheel-title')).toHaveText('The wheel');
  await expect(page.locator('#shelf-title')).toHaveText('The shelf');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('#wheel-title')).toHaveText('The wheel');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('removing a book from the shelf can be undone', async ({ page }) => {
  await enterDemo(page);
  await page.getByTestId('shelf').getByRole('button', { name: /Atomic Habits/ }).click();
  await page.getByRole('button', { name: 'Aus dem Regal nehmen' }).click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('shelf')).not.toContainText('Atomic Habits');
  await expect(wheelCount(page)).toHaveText(/11 Bücher im Rad/);
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByTestId('shelf')).toContainText('Atomic Habits');
  await expect(wheelCount(page)).toHaveText(/12 Bücher im Rad/);
});

test('fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('.dock')).toBeVisible();
});
