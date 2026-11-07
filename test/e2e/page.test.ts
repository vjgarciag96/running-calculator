import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { type Browser, chromium, type Page, webkit } from 'playwright';
import { openPage, serveSite, type Site } from './site.ts';

for (const type of [chromium, webkit]) {
  describe(type.name(), () => {
    let site: Site;
    let browser: Browser;
    let page: Page;

    before(async () => {
      site = await serveSite();
      browser = await type.launch({ chromiumSandbox: true });
    });
    after(async () => {
      await browser.close();
      await site.close();
    });
    beforeEach(async () => {
      page = await openPage(browser, site);
    });
    afterEach(async () => {
      await page.context().close();
    });

    test('typing 5000 as a 10K finish time shows a 5:00 pace', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('5000');

      assert.equal(await page.locator('#pace').textContent(), '5:00 /km');
    });
  });
}
