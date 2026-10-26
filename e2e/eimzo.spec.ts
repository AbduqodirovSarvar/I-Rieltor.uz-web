import { Page, expect, test } from '@playwright/test';
import { PASSWORD, signUp } from './helpers';

/**
 * Signing in, linking a key, resetting a password and applying to an auction with E-IMZO. These need the stand-in E-IMZO server
 * behind the API (backend: `docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.eimzo-fake.yml up -d`)
 * and are skipped unless `E2E_EIMZO_FAKE=1`. The page uses its own stand-in for the program on the computer (a flag in the
 * browser), so no real key is involved. Each test is a new person: a PINFL of its own.
 */
test.skip(
  process.env['E2E_EIMZO_FAKE'] !== '1',
  'needs the fake E-IMZO server: set E2E_EIMZO_FAKE=1',
);

const newPinfl = () =>
  '3' +
  Math.floor(Math.random() * 1e13)
    .toString()
    .padStart(13, '0');

test.beforeEach(async ({ page }) => {
  const pinfl = newPinfl();
  await page.addInitScript((value) => {
    localStorage.setItem('irieltor.dev.fake-eimzo', '1');
    localStorage.setItem('irieltor.dev.fake-eimzo-pinfl', value);
  }, pinfl);
});

const press = (page: Page, text: string) =>
  page.locator(`button:has-text("${text}")`).first().click();

/** A new account made with the key the page offers first (this test's own person), landing in the cabinet. */
async function registerWithKey(page: Page) {
  await page.goto('/kirish');
  await press(page, 'E-IMZO bilan ro‘yxatdan o‘tish');
  await expect(page).toHaveURL(/\/kabinet/, { timeout: 20_000 });
}

test.describe('E-IMZO', () => {
  test('a key creates a verified account and signs in; the same key signs in again later', async ({
    page,
  }) => {
    await page.goto('/kirish');
    await expect(page.locator('.notice-warning').first()).toContainText('Sinov rejimi');
    await expect(page.locator('#eimzo-signin-key option')).toHaveCount(3);

    await registerWithKey(page);
    await expect(page.locator('.who .badge-success')).toBeVisible();

    await page.locator('header button:has-text("Chiqish")').click();
    await page.goto('/kirish');
    await press(page, 'E-IMZO bilan kirish');
    await expect(page).toHaveURL(/\/kabinet/, { timeout: 20_000 });
    await expect(page.locator('.who .badge-success')).toBeVisible();
  });

  test('a key that has no account is told so on sign-in', async ({ page }) => {
    await page.goto('/kirish');
    await press(page, 'E-IMZO bilan kirish');
    await expect(page.locator('.notice-danger')).toContainText('hisob topilmadi');
  });

  test('a password account links the key and becomes verified; the page then shows who it is', async ({
    page,
  }) => {
    await signUp(page);
    await expect(page.locator('.who .badge-success')).toHaveCount(0);
    await page.goto('/kabinet/e-imzo');
    await press(page, 'Kalitni ulash');
    await expect(page.locator('.notice-success').first()).toContainText('Tasdiqlangan', {
      timeout: 20_000,
    });
    await expect(page.locator('.who .badge-success')).toBeVisible();
  });

  test('applying: the text is shown, agreement is needed, then the signed application is accepted', async ({
    page,
    request,
  }) => {
    const objects = await (await request.get('/api/Property/public/list?PageSize=20')).json();
    const auction = objects.data.find(
      (o: { auction: { id: string } | null }) => o.auction,
    )?.auction;
    test.skip(!auction, 'the stack has no auction');
    const status = await (await request.get(`/api/Auction/public?Id=${auction.id}`)).json();
    const open =
      Date.parse(status.data.applicationDeadline) > Date.now() &&
      status.data.status === 'SCHEDULED';
    test.skip(!open, 'the auction does not take applications now');

    await registerWithKey(page);
    await page.goto(`/auksion/${auction.id}/ariza`);
    await expect(page.locator('pre.text')).not.toBeEmpty();
    await press(page, 'Imzolab, ariza berish');
    await expect(page.locator('[role=alert]').filter({ hasText: 'rozilik' })).toBeVisible();

    await page.locator('input[type=checkbox]').check();
    await press(page, 'Imzolab, ariza berish');
    await expect(page).toHaveURL(/\/kabinet\/arizalar$/, { timeout: 20_000 });
    await expect(page.locator('li.card').first()).toContainText('ko‘rib chiqilmoqda');
  });

  test('the password is reset with the key and the person is sent to sign in', async ({ page }) => {
    await registerWithKey(page);
    await page.locator('header button:has-text("Chiqish")').click();
    await page.goto('/parolni-unutdim');
    await page.locator('input#er-password').fill(PASSWORD);
    await page.locator('input#er-confirm').fill(PASSWORD);
    await press(page, 'Imzolab, parolni yangilash');
    await expect(page).toHaveURL(/\/kirish$/, { timeout: 20_000 });
  });
});
