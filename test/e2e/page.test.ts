import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { type Browser, chromium, type Page, webkit } from 'playwright';
import { boxHighlighted, boxText, openPage, serveSite, type Site } from './site.ts';

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

    test('tapping a filled box highlights its value', async () => {
      await page.locator('#goal').tap();

      await boxHighlighted(page);
    });

    test('tapping 50:00 and typing 4500 shows 00:45:00', async () => {
      const field = page.locator('#goal');
      await field.tap();

      await field.pressSequentially('4500');

      assert.equal(await boxText(page), '00:45:00');
    });

    test('the first key clears the highlight', async () => {
      await page.locator('#goal').tap();
      await boxHighlighted(page);

      await page.keyboard.press('4');

      assert.equal(await page.locator('.clock.selected').count(), 0, 'value still highlighted');
    });

    test('tapping a box being typed in highlights it again', async () => {
      const field = page.locator('#goal');
      await field.tap();
      await page.keyboard.press('4');

      await field.tap();

      await boxHighlighted(page);
    });

    test('tapping a highlighted box again still replaces the value', async () => {
      const field = page.locator('#goal');
      await field.tap();
      await boxHighlighted(page);
      await field.tap();

      await page.keyboard.press('4');

      assert.equal(await field.inputValue(), '4');
    });

    test('tapping a box after tabbing past it highlights its value', async () => {
      const field = page.locator('#goal');
      await page.getByRole('radio', { name: 'Finish time' }).focus();
      await page.keyboard.press('Tab');

      await field.tap();

      await boxHighlighted(page);
    });

    test('a highlighted box shows no caret', async () => {
      await page.locator('#goal').tap();

      await boxHighlighted(page);

      assert.equal(await page.locator('.caret:visible').count(), 0, 'caret shown');
    });

    test('a box being typed in shows a caret', async () => {
      await page.locator('#goal').tap();

      await page.keyboard.press('4');

      assert.equal(await page.locator('.caret:visible').count(), 1, 'caret not shown');
    });

    test('a box without focus shows no caret', async () => {
      assert.equal(await page.locator('.caret:visible').count(), 0, 'caret shown');
    });

    test('leaving a highlighted box removes the highlight', async () => {
      const field = page.locator('#goal');
      await field.tap();

      await field.blur();

      const background = await page.locator('.pair:visible .zeros + span').last().evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      assert.equal(background, 'rgba(0, 0, 0, 0)');
    });

    test('pasting 4:30 over a highlighted value shows 00:04:30', async () => {
      await page.locator('#goal').tap();

      await page.keyboard.insertText('4:30');

      assert.equal(await boxText(page), '00:04:30');
    });

    test('pasting at the caret keeps only the digits that fit', async () => {
      const field = page.locator('#goal');
      await field.tap();
      await field.pressSequentially('5000');

      await page.keyboard.insertText('4:30');

      assert.equal(await field.inputValue(), '500043');
    });

    test('pasting text with no digits keeps the value', async () => {
      await page.locator('#goal').tap();

      await page.keyboard.insertText('abc');

      assert.equal(await boxText(page), '00:50:00');
    });

    test('a letter on a highlighted box keeps the value', async () => {
      await page.locator('#goal').tap();

      await page.keyboard.press('a');

      assert.equal(await boxText(page), '00:50:00');
    });

    test('a caret moved before the digits goes back to the end', async () => {
      await page.locator('#goal').tap();
      await boxHighlighted(page);
      await page.keyboard.press('ArrowLeft');
      await page.locator('.clock:not(.selected)').waitFor({ state: 'attached', timeout: 2000 });

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
