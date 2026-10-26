import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, publicObjects, signUp } from './helpers';

/** Accessibility (WCAG 2.1 A and AA rules of axe) and layout at phone, tablet and desktop widths. */
const PUBLIC = [
  '/',
  '/katalog',
  '/biz-haqida',
  '/qoidalar',
  '/maxfiylik',
  '/kirish',
  '/royxatdan-otish',
];
const PERSONAL = ['profil', 'arizalar', 'tolovlar', 'bildirishnomalar', 'hujjatlar', 'xavfsizlik'];
const WIDTHS = [360, 768, 1440];

async function violations(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test('public pages have no violations', async ({ page, request }) => {
      const objects = await publicObjects(request);
      const paths = [...PUBLIC];
      if (objects[0]) paths.push(`/obyekt/${objects[0].id}`);
      if (objects.find((o) => o.auction))
        paths.push(`/auksion/${objects.find((o) => o.auction)!.auction!.id}`);
      for (const path of paths) {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(await violations(page), path).toEqual([]);
      }
    });

    test('the cabinet pages have no violations', async ({ page }) => {
      await signUp(page);
      for (const path of PERSONAL) {
        await page.goto(`/kabinet/${path}`, { waitUntil: 'networkidle' });
        expect(await violations(page), path).toEqual([]);
      }
    });
  });
}

test.describe('keyboard', () => {
  test('the first Tab stop is the skip link, and it moves focus to the content', async ({
    page,
  }) => {
    await page.goto('/katalog');
    await page.keyboard.press('Tab');
    const first = page.locator(':focus');
    await expect(first).toHaveAttribute('href', /#/);
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await expect(page).toHaveURL(/\/katalog$/);
  });

  test('every button that has only an icon has a name', async ({ page }) => {
    for (const path of ['/', '/katalog', '/biz-haqida']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const unnamed = await page.$$eval('button, a[href]', (items) =>
        items
          .filter((item) => {
            const text = (item.textContent ?? '').trim();
            return (
              !text &&
              !item.getAttribute('aria-label') &&
              !item.getAttribute('aria-labelledby') &&
              !item.querySelector('img[alt]:not([alt=""])')
            );
          })
          .map((item) => item.outerHTML.slice(0, 100)),
      );
      expect(unnamed, path).toEqual([]);
    }
  });

  test('with reduced motion nothing keeps moving', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity,
          ).length,
    );
    expect(running).toBe(0);
    await context.close();
  });
});

test.describe('layout at different widths', () => {
  for (const width of WIDTHS) {
    test(`no horizontal scrolling at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      const objects = await publicObjects(request);
      const paths = [...PUBLIC];
      if (objects[0]) paths.push(`/obyekt/${objects[0].id}`);
      if (objects.find((o) => o.auction))
        paths.push(`/auksion/${objects.find((o) => o.auction)!.auction!.id}`);
      for (const path of paths) {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(await hasHorizontalScroll(page), `${path} at ${width}px`).toBe(false);
      }
    });
  }
});
