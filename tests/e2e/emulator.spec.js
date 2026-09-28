// Two club members in separate browsers, against the Firebase Auth + Firestore
// emulators (the real Firebase code path and security rules).
// Run with: npm run test:e2e:emulator
import { expect, test } from '@playwright/test';
import { stubCatalogue, wheelCount } from './helpers.js';

const stamp = Date.now().toString(36);

async function clearEmulators(request) {
  await request.delete('http://127.0.0.1:8080/emulator/v1/projects/demo-bookwheel/databases/(default)/documents');
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-bookwheel/accounts');
}

async function register(page, name, email) {
  await page.goto('/');
  await page.getByTestId('auth-toggle').click();
  await page.getByTestId('reg-name').fill(name);
  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill('lesen123');
  await page.getByTestId('auth-submit').click();
}

async function addBook(page, { title, author, genre, pages }) {
  await page.getByTestId('add-book').click();
  await page.getByTestId('book-title').fill(title);
  await page.getByTestId('book-author').fill(author);
  if (pages) await page.getByTestId('book-pages').fill(String(pages));
  await page.getByRole('radio', { name: genre, exact: true }).check({ force: true });
  await page.getByTestId('book-submit').click();
  await expect(page.getByTestId('shelf')).toContainText(title);
}

test('founding, joining by invite code, spinning, progress and the rating reveal', async ({ browser, request }) => {
  test.setTimeout(120_000);
  await clearEmulators(request);

  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  for (const p of [alice, bob]) {
    await stubCatalogue(p);
    await p.emulateMedia({ reducedMotion: 'reduce' });
  }

  // ── Alice signs up and founds the club ──
  await register(alice, 'Alice', `alice-${stamp}@example.com`);
  await expect(alice.getByTestId('club-name')).toBeVisible();
  await expect(alice.getByTestId('member-name')).toHaveValue('Alice');
  await alice.getByTestId('club-name').fill('Seitenspringer');
  await alice.getByTestId('gate-submit').click();
  await expect(alice.locator('#wheel')).toBeVisible();
  await expect(alice.locator('.top .club')).toHaveText('Seitenspringer');

  await addBook(alice, { title: 'Piranesi', author: 'Susanna Clarke', genre: 'Fantasy', pages: 272 });
  await addBook(alice, { title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi', pages: 600 });
  await expect(wheelCount(alice)).toHaveText(/2 Bücher im Rad/);

  // Invite code from the club dialog
  await alice.getByTestId('user-menu').click();
  await alice.getByTestId('open-club').click();
  const code = (await alice.getByTestId('invite-code').getAttribute('aria-label')).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await alice.keyboard.press('Escape');

  // ── Bob signs up, a wrong code is refused, the right one lets him in ──
  await register(bob, 'Bob', `bob-${stamp}@example.com`);
  await expect(bob.getByTestId('join-code')).toBeVisible();
  await expect(bob.getByText('Seitenspringer beitreten')).toBeVisible();
  await bob.getByTestId('join-code').fill('ZZZZ-ZZZZ');
  await bob.getByTestId('gate-submit').click();
  await expect(bob.getByText('Dieser Code passt nicht')).toBeVisible();
  await bob.getByTestId('join-code').fill(code.toLowerCase().replace('-', ' '));
  await bob.getByTestId('gate-submit').click();
  await expect(bob.locator('#wheel')).toBeVisible();
  await expect(bob.getByTestId('shelf')).toContainText('Piranesi');
  await expect(wheelCount(bob)).toHaveText(/2 Bücher im Rad/);

  // ── Alice spins; Bob gets the popup live and the wheel updates for both ──
  await alice.locator('.filters .tag', { hasText: 'Fantasy' }).click();
  await alice.getByTestId('spin').click();
  await expect(alice.getByTestId('spin-result')).toContainText('Piranesi', { timeout: 10_000 });
  await expect(bob.getByTestId('spin-result')).toContainText('Alice hat am Rad gedreht!');
  await expect(bob.getByTestId('spin-result')).toContainText('Piranesi');
  await bob.getByTestId('result-start').click();
  await alice.getByTestId('result-start').click();
  await expect(bob.locator('#current-title')).toHaveText('Piranesi');
  await expect(wheelCount(bob)).toHaveText(/1 Buch im Rad/);

  // ── Goals and progress sync between members ──
  await alice.getByTestId('add-goal').click();
  const d = new Date(Date.now() + 5 * 86400000);
  await alice.getByTestId('goal-date').fill(d.toISOString().slice(0, 10));
  await alice.getByTestId('goal-page').fill('50');
  await alice.locator('.g-form').getByRole('button', { name: 'Speichern' }).click();
  await expect(bob.locator('.next-goal')).toContainText('Seite 50');

  await bob.getByTestId('page-input').fill('30');
  await bob.getByTestId('page-input').press('Enter');
  const bobOnAlice = alice.getByTestId('ticker').locator('li', { hasText: 'Bob' });
  await expect(bobOnAlice).toContainText('S. 30 / 272');
  await expect(bobOnAlice).toContainText('noch 20 S. bis zum Ziel');

  // ── Both finish and rate; the average appears only once both have rated ──
  await alice.getByTestId('mark-read').click();
  await alice.getByRole('radio', { name: '5 Sterne' }).click();
  await alice.getByTestId('review-submit').click();
  const bobEntry = bob.getByTestId('chronicle-entry').filter({ hasText: 'Piranesi' });
  await expect(bobEntry).toContainText('1 von 2 Bewertungen');
  await expect(bobEntry).toContainText('Es fehlt noch: du');

  await bob.getByTestId('mark-read').click();
  await bob.getByRole('radio', { name: '3 Sterne' }).click();
  await bob.getByTestId('review-text').fill('Schön, aber verwirrend.');
  await bob.getByTestId('review-submit').click();
  const aliceEntry = alice.getByTestId('chronicle-entry').filter({ hasText: 'Piranesi' });
  await expect(aliceEntry.getByTestId('avg-rating')).toContainText('4,0');
  await expect(bobEntry.getByTestId('avg-rating')).toContainText('4,0');
  await aliceEntry.getByRole('button', { name: 'Rezensionen lesen' }).click();
  await expect(aliceEntry).toContainText('Schön, aber verwirrend.');

  // ── A removed member is locked out ──
  await alice.getByTestId('user-menu').click();
  await alice.getByTestId('open-club').click();
  await alice.locator('.members li', { hasText: 'Bob' }).getByRole('button', { name: 'Entfernen' }).click();
  await alice.getByTestId('confirm-yes').click();
  await expect(bob.getByTestId('join-code')).toBeVisible();
});
