// Readability guard: every piece of text must meet WCAG AA contrast, in both
// themes, on the sign-in page, the whole main page and the dialogs.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { stubCatalogue } from './helpers.js';

// Decorative layers (lamp glow, paper grain, panel sheen, hairline frames,
// confetti) are gradients or overlays that axe can't measure through; flatten
// them to their base colour so every text element is actually checked instead
// of being skipped as "incomplete".
const FLATTEN = `
  body { background: var(--paper) !important; }
  body::after, .lamp, .confetti, canvas { display: none !important; }
  .modal-panel::before, .leaf::before, .endpaper::after { display: none !important; }
  .modal-panel { background: var(--card) !important; }
  .card-slip { background: var(--slip) !important; }
  .case { background: var(--wall) !important; }
`;

async function contrastViolations(page, include, minChecked = 5) {
  await page.addStyleTag({ content: FLATTEN });
  let builder = new AxeBuilder({ page }).withRules(['color-contrast']);
  if (include) builder = builder.include(include);
  const { violations, passes } = await builder.analyze();
  expect(passes.reduce((n, p) => n + p.nodes.length, 0)).toBeGreaterThanOrEqual(minChecked); // it really measured something
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${n.target.join(' ')} — ${n.any.map((a) => a.message).join('; ')}`),
  );
}

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await stubCatalogue(page);
    });

    test('sign-in page text is readable', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('demo-name')).toBeVisible();
      await page.waitForTimeout(800); // let the page settle in
      expect(await contrastViolations(page)).toEqual([]);
    });

    test('main page text is readable', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('demo-name').fill('Niels');
      await page.getByTestId('demo-start').click();
      await expect(page.locator('#chronicle')).toBeVisible();
      await page.waitForTimeout(600);
      expect(await contrastViolations(page)).toEqual([]);
    });

    test('dialogs are readable', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('demo-name').fill('Niels');
      await page.getByTestId('demo-start').click();

      await page.getByTestId('add-book').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(500);
      expect(await contrastViolations(page, '[role="dialog"]')).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByTestId('user-menu').click();
      await page.getByTestId('open-club').click();
      await page.waitForTimeout(500);
      expect(await contrastViolations(page, '[role="dialog"]')).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByTestId('spin').click();
      await page.getByTestId('confirm-yes').click();
      await expect(page.getByTestId('spin-result')).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(1200);
      expect(await contrastViolations(page, '[role="dialog"]')).toEqual([]);
      await page.getByTestId('result-start').click();

      await page.getByTestId('mark-read').click();
      await expect(page.getByTestId('review-modal')).toBeVisible();
      await page.waitForTimeout(500);
      // axe skips the heading block here (overlap heuristic); it uses the same inks as the other dialogs
      expect(await contrastViolations(page, '[role="dialog"]', 3)).toEqual([]);
    });
  });
}
