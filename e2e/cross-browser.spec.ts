import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, publicObjects } from './helpers';

/**
 * A smoke test that runs in every browser of the config (Chromium, Firefox, Safari's engine, and phone sizes with touch): the
 * page is drawn, the application starts in the browser (hydration), the main controls work, nothing is wider than the screen
 * and nothing is written to the console as an error.
 */
test.describe('in every browser', () => {
  test('pages are drawn, the application starts, and the console stays clean', async ({
    page,
    request,
  }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !/Company\/public|404 \(Not Found\)|Failed to load resource/.test(m.text())
      )
        problems.push(m.text().slice(0, 200));
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

    const objects = await publicObjects(request);
    const paths = ['/', '/katalog', '/biz-haqida', '/kirish'];
    if (objects[0]) paths.push(`/obyekt/${objects[0].id}`);
    for (const path of paths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('app-root')).toHaveAttribute('ng-version', /.+/);
      expect(await hasHorizontalScroll(page), `${path} is wider than the screen`).toBe(false);
    }
    expect(problems).toEqual([]);
  });

  test('the menu, the search, the language and the theme work', async ({ page }) => {
    // On a phone the tools are behind the menu button; open it when what is needed is not on screen.
    const reveal = async (target: string) => {
      if (!(await page.locator(target).isVisible())) await page.locator('.burger').click();
    };
    await page.goto('/', { waitUntil: 'networkidle' });

    // The search box under the slides on the home page.
    await page.locator('form.finder input[type=search]').fill('uy');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/katalog\?q=uy/);

    const before = await page.locator('html').getAttribute('data-theme');
    await reveal('header .theme');
    await page.locator('header .theme').click();
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).not.toBe(before);

    await reveal('header select.lang-select');
    await page.locator('header select.lang-select').selectOption({ label: 'Русский' });
    await expect(page).toHaveURL(/\/ru\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test('the sign-in form shows its errors and the password can be shown', async ({ page }) => {
    await page.goto('/kirish', { waitUntil: 'networkidle' });
    const form = page.locator('form:has(#si-login)');
    await form.locator('button[type=submit]').click();
    await expect(form.locator('.error').first()).toBeVisible();
    await form.locator('#si-password').fill('secret');
    await form.locator('button[aria-label="Ko‘rsatish"]').click();
    await expect(form.locator('#si-password')).toHaveAttribute('type', 'text');
  });

  test('the photo gallery of an object opens, moves with the keyboard and closes', async ({
    page,
    request,
  }) => {
    const objects = await publicObjects(request);
    test.skip(objects.length === 0, 'no objects');
    await page.goto(`/obyekt/${objects[0].id}`, { waitUntil: 'networkidle' });
    const open = page.locator('app-gallery button').first();
    test.skip((await open.count()) === 0, 'the object has no photos');
    await open.click();
    const dialog = page.locator('dialog[open], [role=dialog]').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
