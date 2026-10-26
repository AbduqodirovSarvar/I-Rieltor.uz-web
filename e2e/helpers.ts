import { APIRequestContext, Page, expect } from '@playwright/test';

export const PASSWORD = 'Strong@123';

/** A fresh e-mail for each test run: sign-up refuses a taken one. */
export const freshEmail = (tag: string) =>
  `e2e.${tag}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@example.uz`;

/** Makes an account through the sign-up page and lands in the cabinet. */
export async function signUp(page: Page, email = freshEmail('user')): Promise<string> {
  await page.goto('/royxatdan-otish');
  await page.locator('#su-first').fill('Ali');
  await page.locator('#su-last').fill('Valiyev');
  await page.locator('#su-email').fill(email);
  await page.locator('#su-password').fill(PASSWORD);
  await page.locator('#su-confirm').fill(PASSWORD);
  // Sign-up is limited per minute and address; many tests in a row can hit it, so wait as the page says and press again.
  for (let attempt = 0; attempt < 4; attempt++) {
    const submit = page.locator('app-sign-up-page button[type=submit]');
    await expect(submit).toBeEnabled({ timeout: 70_000 });
    await submit.click();
    const arrived = await page
      .waitForURL(/\/kabinet/, { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (arrived) return email;
    await page.waitForTimeout(15_000);
  }
  await page.waitForURL(/\/kabinet/);
  return email;
}

export interface PublicObject {
  id: string;
  title: string | null;
  auction: { id: string } | null;
}

/** The objects the catalog shows now, straight from the API, so tests do not depend on particular ids. */
export async function publicObjects(request: APIRequestContext): Promise<PublicObject[]> {
  const response = await request.get('/api/Property/public/list?PageSize=20');
  expect(response.ok()).toBe(true);
  return (await response.json()).data ?? [];
}

/** No horizontal scrolling: the page is not wider than the window. */
export const hasHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
