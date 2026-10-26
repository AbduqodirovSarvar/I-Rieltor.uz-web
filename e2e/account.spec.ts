import { expect, test } from '@playwright/test';
import { PASSWORD, freshEmail, signUp } from './helpers';

test.describe('account', () => {
  test('a personal page without a session sends the person to sign in, and back after signing in', async ({
    page,
  }) => {
    const email = freshEmail('guard');
    // The account exists first; then a fresh browser context has no session.
    await signUp(page, email);
    await page.evaluate(() => localStorage.clear());

    await page.goto('/kabinet/hujjatlar');
    await expect(page).toHaveURL(/\/kirish\?returnUrl=/);
    await page.locator('#si-login').fill(email);
    await page.locator('#si-password').fill(PASSWORD);
    await page.locator('form:has(#si-login) button[type=submit]').click();
    await expect(page).toHaveURL(/\/kabinet\/hujjatlar$/);
  });

  test('a wrong password is said plainly and a right one opens the cabinet', async ({ page }) => {
    const email = freshEmail('login');
    await signUp(page, email);
    await page.locator('header button:has-text("Chiqish")').click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/kirish');
    await page.locator('#si-login').fill(email);
    await page.locator('#si-password').fill('Wrong@12345');
    await page.locator('form:has(#si-login) button[type=submit]').click();
    await expect(page.locator('form:has(#si-login) [role=alert]')).toBeVisible();

    await page.locator('#si-password').fill(PASSWORD);
    await page.locator('form:has(#si-login) button[type=submit]').click();
    await expect(page).toHaveURL(/\/kabinet/);
  });

  test('the person edits their profile and sees it saved after a reload', async ({ page }) => {
    await signUp(page);
    await page.goto('/kabinet/profil');
    await page.locator('#pf-address').fill('Toshkent, Amir Temur 1');
    const saved = page.waitForResponse(
      (r) => r.url().includes('/api/Auth/me/profile') && r.request().method() === 'PUT',
    );
    await page.locator('app-profile-page form').first().locator('button[type=submit]').click();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.locator('#pf-address')).toHaveValue('Toshkent, Amir Temur 1');
  });

  test('a document is uploaded, listed, and deleted after a question', async ({ page }) => {
    await signUp(page);
    await page.goto('/kabinet/hujjatlar');
    await page.locator('#doc-file').setInputFiles({
      name: 'pasport.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
    });
    await page.locator('app-documents-page form button[type=submit]').click();
    await expect(page.locator('.doc-name')).toHaveText('pasport.pdf');

    await page.locator('li.doc button:has-text("O‘chirish")').click();
    await page.locator('dialog[open] button').last().click();
    await expect(page.locator('.doc-name')).toHaveCount(0);
  });

  test('the applications, payments and messages pages say that there is nothing yet', async ({
    page,
  }) => {
    await signUp(page);
    for (const path of ['arizalar', 'tolovlar', 'bildirishnomalar']) {
      await page.goto(`/kabinet/${path}`);
      await expect(page.locator('app-empty-state')).toBeVisible();
    }
  });

  test('"forgot password" answers the same for an address nobody has', async ({ page }) => {
    await page.goto('/kirish');
    await page.locator('a[href="/parolni-unutdim"]').click();
    await page.locator('#fp-email').fill(freshEmail('nobody'));
    await page.locator('form:has(#fp-email) button[type=submit]').click();
    await expect(page.locator('.notice-success')).toBeVisible();
  });

  test('a reset link that is wrong is refused without leaving the token in the address', async ({
    page,
  }) => {
    await page.goto('/parolni-tiklash?token=garbage.token');
    await expect(page).toHaveURL(/\/parolni-tiklash$/);
    await page.locator('#rp-password').fill('Newer@12345');
    await page.locator('#rp-confirm').fill('Newer@12345');
    await page.locator('app-reset-password-page button[type=submit]').click();
    await expect(page.locator('.notice-danger')).toBeVisible();
  });
});
