import { expect, test } from '@playwright/test';
import { publicObjects } from './helpers';

/** What a visitor without an account does: look around. */
test.describe('guest', () => {
  test('home, then the catalog, then an object, then its auction', async ({ page, request }) => {
    const objects = await publicObjects(request);
    test.skip(objects.length === 0, 'the stack has no published objects');
    const withAuction = objects.find((o) => o.auction);

    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    await page.locator('header a[href="/katalog"]').first().click();
    await expect(page).toHaveURL(/\/katalog$/);
    await expect(page.locator('app-property-card').first()).toBeVisible();

    await page.locator('app-property-card h2 a').first().click();
    await expect(page).toHaveURL(/\/obyekt\//);
    await expect(page.locator('h1')).toBeVisible();

    if (withAuction) {
      await page.goto(`/obyekt/${withAuction.id}`);
      await page.locator(`a[href="/auksion/${withAuction.auction!.id}"]`).first().click();
      await expect(page).toHaveURL(/\/auksion\//);
      await expect(page.locator('h1')).toBeVisible();
      // Not signed in: asked to sign in, not shown a bid form.
      await expect(page.locator('#bid-amount')).toHaveCount(0);
    }
  });

  test('the catalog filters by words and keeps the filter in the address', async ({ page }) => {
    await page.goto('/katalog');
    await page.locator('#f-q').fill('zzzz-nothing-like-this');
    await expect(page).toHaveURL(/q=zzzz-nothing-like-this/);
    await expect(page.locator('app-property-card')).toHaveCount(0);
    await expect(page.locator('app-empty-state')).toBeVisible();
  });

  test('the Russian version has its own addresses, language and title', async ({ page }) => {
    await page.goto('/biz-haqida');
    await page.locator('a.lang').click();
    await expect(page).toHaveURL(/\/ru\/biz-haqida$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page).toHaveTitle(/О нас/);
  });

  test('an unknown address is a real 404 page with a way home', async ({ page }) => {
    const response = await page.goto('/yoq-bunday-sahifa');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });

  test('an object that does not exist is a 404, not an empty page', async ({ page }) => {
    const response = await page.goto('/obyekt/00000000-0000-0000-0000-000000000000');
    expect(response?.status()).toBe(404);
  });

  test('the contact form asks for a way to answer before it sends', async ({ page }) => {
    await page.goto('/biz-haqida');
    const form = page.locator('form:has(#ct-name)');
    await form.locator('#ct-name').fill('Ali');
    await form.locator('#ct-message').fill('Salom, narx haqida bilmoqchiman.');
    await form.locator('button[type=submit]').click();
    await expect(form.locator('[role=alert]').first()).toBeVisible();
  });
});
