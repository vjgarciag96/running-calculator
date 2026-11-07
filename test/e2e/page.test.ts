import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { type Browser, chromium, type Page, webkit } from 'playwright';
import { boxText, openPage, serveSite, type Site } from './site.ts';

for (const type of [chromium, webkit]) {
  describe(type.name(), () => {
    let site: Site;
    let browser: Browser | undefined;
    let page: Page;

    before(async () => {
      site = await serveSite();
      // GitHub's Ubuntu runner can't start Chromium's sandbox. The pages only reach our own
      // server, so the sandbox has nothing untrusted to contain.
      browser = await type.launch({ chromiumSandbox: false });
    });
    // A browser that failed to launch must not keep the server open, or the run never exits.
    after(async () => {
      await browser?.close();
      await site.close();
    });
    beforeEach(async () => {
      page = await openPage(browser!, site);
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
    test('typing 4500 as a finish time shows 00:45:00', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('4500');

      assert.equal(await boxText(page), '00:45:00');
    });

    test('Backspace after 4500 shows 00:04:50', async () => {
      const field = page.locator('#goal');
      await field.fill('');
      await field.pressSequentially('4500');

      await field.press('Backspace');

      assert.equal(await boxText(page), '00:04:50');
    });

    test('the results follow Backspace', async () => {
      const field = page.locator('#goal');
      await field.fill('');
      await field.pressSequentially('4500');

      await field.press('Backspace');

      assert.equal(await page.locator('#finish').textContent(), '4:50');
    });

    test('a seventh digit is dropped from the field', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('1234567');

      assert.equal(await field.inputValue(), '123456');
    });

    test('a colon does not get into the field', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('4:30');

      assert.equal(await field.inputValue(), '430');
    });

    test('tapping the middle of the box types after the digits', async () => {
      const box = (await page.locator('.pairs').boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

      await page.keyboard.press('1');

      assert.equal(await page.locator('#goal').inputValue(), '50001');
    });

    test('zeros the user has not typed are dimmed', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('45');

      const dimmed = await page.locator('.pair:visible .zeros').allTextContents();
      assert.equal(dimmed.join(''), '0000');
    });

    test('zeros the user has not typed are a different colour from the typed digits', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('45');

      const colour = (selector: string) =>
        page.locator(selector).last().evaluate((element) => getComputedStyle(element).color);
      assert.notEqual(
        await colour('.pair:visible .zeros'),
        await colour('.pair:visible .zeros + span'),
        'untyped zeros and typed digits share a colour',
      );
    });

    test('switching a six-digit finish time to a pace keeps the first four digits', async () => {
      const field = page.locator('#goal');
      await field.fill('');
      await field.pressSequentially('123456');

      await page.getByRole('radio', { name: 'Pace', exact: true }).click();

      assert.equal(await field.inputValue(), '1234');
    });

    test('switching a six-digit finish time to a pace shows its first four digits', async () => {
      const field = page.locator('#goal');
      await field.fill('');
      await field.pressSequentially('123456');

      await page.getByRole('radio', { name: 'Pace', exact: true }).click();

      assert.equal(await boxText(page), '12:34');
    });

    test('typing a leading zero shows no error', async () => {
      const field = page.locator('#goal');
      await field.fill('');

      await field.press('0');

      assert.equal(await page.locator('#message').textContent(), '');
    });

    test('typing 430 as a pace shows 04:30', async () => {
      await page.getByRole('radio', { name: 'Pace', exact: true }).click();
      const field = page.locator('#goal');
      await field.fill('');

      await field.pressSequentially('430');

      assert.equal(await boxText(page), '04:30');
    });

    test('a pace has no hours', async () => {
      await page.getByRole('radio', { name: 'Pace', exact: true }).click();

      assert.equal(await page.locator('.hh:visible').count(), 0, 'hh pair or its colon shown');
    });
  });
}
