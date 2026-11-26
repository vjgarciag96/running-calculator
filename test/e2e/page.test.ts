import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { type Browser, chromium, type Page, webkit } from 'playwright';
import {
  boxHighlighted,
  boxText,
  colour,
  compose,
  description,
  lastSplit,
  openPage,
  records,
  scrollBox,
  serveSite,
  type Site,
  tagText,
  totalCellStyle,
} from './site.ts';

// Both boxes take a tap, a key, a paste and a composition the same way, whichever is the goal.
const BOXES = [
  {
    kind: 'time',
    // What the box shows on a fresh page.
    text: '00:50:00',
    // After tapping it and typing 4500.
    typed: '00:45:00',
    // After pasting 4:30 over the highlighted value.
    pasted: '00:04:30',
    // Typed before pasting 4:30 at the caret, and the field's value after that paste.
    atCaret: '5000',
    pastedAtCaret: '500043',
    // The field's value after moving the caret left and typing 1, from the default or atCaret.
    plusOne: '50001',
    // What Tab moves focus from to reach the box.
    tabFrom: '[value=marathon]',
  },
  {
    kind: 'pace',
    text: '05:00',
    typed: '45:00',
    pasted: '04:30',
    atCaret: '500',
    pastedAtCaret: '5004',
    plusOne: '5001',
    tabFrom: '#time',
  },
] as const;

// A laptop's window, wide enough for the splits beside the goal.
const DESKTOP = { width: 1280, height: 900 };

// The records block for each distance, as it reads on the English page.
const RECORDS = [
  {
    preset: '5k',
    en: [
      ['World records'],
      ['Men', '12:49', '2:34 /km', 'Berihu Aregawi, 2021'],
      ['Women', '13:54', '2:47 /km', 'Beatrice Chebet, 2024'],
    ],
  },
  {
    preset: '10k',
    en: [
      ['World records'],
      ['Men', '26:31', '2:39 /km', 'Yomif Kejelcha, 2025'],
      ['Women', '28:46', '2:53 /km', 'Agnes Ngetich, 2024'],
    ],
  },
  {
    preset: 'half',
    en: [
      ['World records'],
      ['Men', '57:20', '2:43 /km', 'Jacob Kiplimo, 2026'],
      ['Women', '1:02:52', '2:59 /km', 'Letesenbet Gidey, 2021'],
    ],
  },
  {
    preset: 'marathon',
    en: [
      ['World records'],
      ['Men', '1:59:30', '2:50 /km', 'Sabastian Sawe, 2026'],
      ['Women', '2:09:56', '3:05 /km', 'Ruth Chepngetich, 2024'],
    ],
  },
] as const;

// The same block on the Spanish page: only the labels change.
function inSpanish(block: readonly (readonly string[])[]): string[][] {
  const labels: Record<string, string> = {
    'World records': 'Récords mundiales',
    Men: 'Hombres',
    Women: 'Mujeres',
  };
  return block.map(([label, ...values]) => [labels[label], ...values]);
}

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

    // Playwright drives an input method only through Chromium's DevTools protocol.
    const noIme = type !== chromium && 'Playwright cannot compose text in this browser';

    test('the default page has a 50:00 goal and a 5:00 calculated pace', async () => {
      const shown = {
        time: await boxText(page, 'time'),
        timeTag: await tagText(page, 'time'),
        pace: await boxText(page, 'pace'),
        paceTag: await tagText(page, 'pace'),
      };

      assert.deepEqual(shown, {
        time: '00:50:00',
        timeTag: 'Your goal',
        pace: '05:00',
        paceTag: 'Calculated',
      });
    });

    test('typing 5000 as a 10K finish time shows a 5:00 pace', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('5000');

      assert.equal(await boxText(page, 'pace'), '05:00');
    });

    test('typing 4500 as a finish time shows 00:45:00', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('4500');

      assert.equal(await boxText(page), '00:45:00');
    });

    test('Backspace after 4500 shows 00:04:50', async () => {
      const field = page.locator('#time');
      await field.fill('');
      await field.pressSequentially('4500');

      await field.press('Backspace');

      assert.equal(await boxText(page), '00:04:50');
    });

    test('the calculated pace follows Backspace', async () => {
      const field = page.locator('#time');
      await field.fill('');
      await field.pressSequentially('4500');

      await field.press('Backspace');

      assert.equal(await boxText(page, 'pace'), '00:29');
    });

    test('a seventh digit is dropped from the field', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('1234567');

      assert.equal(await field.inputValue(), '123456');
    });

    test('a colon does not get into the field', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('4:30');

      assert.equal(await field.inputValue(), '430');
    });

    test('zeros the user has not typed are dimmed', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('45');

      const dimmed = await page.locator('.clock:has(#time) .zeros').allTextContents();
      assert.equal(dimmed.join(''), '0000');
    });

    test('zeros the user has not typed are a different colour from the typed digits', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.pressSequentially('45');

      assert.notEqual(
        await colour(page, '.clock:has(#time) .zeros'),
        await colour(page, '.clock:has(#time) .zeros + span'),
        'untyped zeros and typed digits share a colour',
      );
    });

    test('typing a leading zero shows no error', async () => {
      const field = page.locator('#time');
      await field.fill('');

      await field.press('0');

      assert.equal(await page.locator('#message').textContent(), '');
    });

    test('typing 430 as a pace shows 04:30', async () => {
      const field = page.locator('#pace');
      await field.fill('');

      await field.pressSequentially('430');

      assert.equal(await boxText(page, 'pace'), '04:30');
    });

    test('a pace has no hours', async () => {
      assert.equal(await page.locator('.clock:has(#pace) .pair').count(), 2, 'pairs in pace box');
    });

    test('a 4:30 pace goal on a 10K switched to the half keeps the pace', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.type('430');

      await page.getByRole('radio', { name: 'Half' }).click();

      const shown = {
        pace: await boxText(page, 'pace'),
        paceTag: await tagText(page, 'pace'),
        time: await boxText(page, 'time'),
      };
      assert.deepEqual(shown, { pace: '04:30', paceTag: 'Your goal', time: '01:34:56' });
    });

    test('tapping the Calculated box and leaving it keeps the tags', async () => {
      const field = page.locator('#pace');
      await field.tap();
      await boxHighlighted(page, true, 'pace');

      await field.blur();

      const shown = {
        timeTag: await tagText(page, 'time'),
        paceTag: await tagText(page, 'pace'),
        time: await boxText(page, 'time'),
      };
      assert.deepEqual(shown, { timeTag: 'Your goal', paceTag: 'Calculated', time: '00:50:00' });
    });

    test('the first key in the Calculated box makes it the goal', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.press('4');

      const tags = { time: await tagText(page, 'time'), pace: await tagText(page, 'pace') };
      assert.deepEqual(tags, { time: 'Calculated', pace: 'Your goal' });
    });

    test('the finish time follows the first key typed in the pace box', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.press('4');

      assert.equal(await boxText(page, 'time'), '00:00:40');
    });

    test('the finish time follows each key typed in the pace box', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.press('4');

      await page.keyboard.press('3');

      assert.equal(await boxText(page, 'time'), '00:07:10');
    });

    test('Backspace on the highlighted Calculated box empties both boxes', async () => {
      await page.locator('#pace').tap();
      await boxHighlighted(page, true, 'pace');

      await page.keyboard.press('Backspace');

      const shown = {
        pace: await boxText(page, 'pace'),
        paceTag: await tagText(page, 'pace'),
        time: await boxText(page, 'time'),
        splits: await page.locator('tbody tr').count(),
      };
      assert.deepEqual(shown, { pace: '00:00', paceTag: 'Your goal', time: '00:00:00', splits: 0 });
    });

    test('a letter on the Calculated box keeps it Calculated', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.press('a');

      assert.equal(await tagText(page, 'pace'), 'Calculated');
    });

    test('pasting text with no digits into the Calculated box keeps it Calculated', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.insertText('abc');

      assert.equal(await tagText(page, 'pace'), 'Calculated');
    });

    test('composing a word over the Calculated box keeps it Calculated', {
      skip: noIme,
    }, async () => {
      await page.locator('#pace').tap();
      await boxHighlighted(page, true, 'pace');

      await compose(page, ['k', 'か'], 'か');

      assert.equal(await tagText(page, 'pace'), 'Calculated');
    });

    test('the goal tag looks different from the Calculated tag', async () => {
      const colours = {
        time: await colour(page, '#time-tag'),
        pace: await colour(page, '#pace-tag'),
      };

      assert.notEqual(colours.time, colours.pace, 'tags share a colour');
    });

    test('the tag of a new goal takes the goal look', async () => {
      const goalColour = await colour(page, '#time-tag');
      await page.locator('#pace').tap();

      await page.keyboard.press('4');

      assert.equal(
        await colour(page, '#pace-tag'),
        goalColour,
        'new goal tag not in the goal colour',
      );
    });

    test(
      'digits composed in the Calculated box show while composing',
      { skip: noIme },
      async () => {
        await page.locator('#pace').tap();
        await boxHighlighted(page, true, 'pace');

        await compose(page, ['4', '45']);

        assert.equal(await boxText(page, 'pace'), '00:45');
      },
    );

    test('a word composed in the Calculated box leaves its value showing', {
      skip: noIme,
    }, async () => {
      await page.locator('#pace').tap();
      await boxHighlighted(page, true, 'pace');

      await compose(page, ['k', 'か']);

      assert.equal(await boxText(page, 'pace'), '05:00');
    });

    test('an empty box describes no value', async () => {
      await page.locator('#pace').tap();
      await boxHighlighted(page, true, 'pace');

      await page.keyboard.press('Backspace');

      assert.equal(await description(page, 'time'), 'Calculated');
    });

    test('each box describes its value as a time, with its tag', async () => {
      const described = {
        time: await description(page, 'time'),
        pace: await description(page, 'pace'),
      };

      assert.deepEqual(described, { time: '50:00 Your goal', pace: '5:00 /km Calculated' });
    });

    test('a swap and a distance switch update what each box describes', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.type('430');

      await page.getByRole('radio', { name: 'Half' }).click();

      const described = {
        time: await description(page, 'time'),
        pace: await description(page, 'pace'),
      };
      assert.deepEqual(described, { time: '1:34:56 Calculated', pace: '4:30 /km Your goal' });
    });

    test('the default page shows ten splits ending at 10 km in 50:00', async () => {
      const shown = { rows: await page.locator('tbody tr').count(), last: await lastSplit(page) };

      assert.deepEqual(shown, { rows: 10, last: ['10', '5:00', '50:00'] });
    });

    test('a 4:30 pace goal switched to the half shows its splits to 1:34:56', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.type('430');

      await page.getByRole('radio', { name: 'Half' }).click();

      const shown = { rows: await page.locator('tbody tr').count(), last: await lastSplit(page) };
      assert.deepEqual(shown, { rows: 22, last: ['21.0975', '0:26', '1:34:56'] });
    });

    test('only the goal box is described by the message', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.press('4');

      const describedBy = {
        time: await page.locator('#time').getAttribute('aria-describedby'),
        pace: await page.locator('#pace').getAttribute('aria-describedby'),
      };
      assert.deepEqual(describedBy, {
        time: 'time-value time-tag',
        pace: 'pace-value pace-tag message',
      });
    });

    test('only the goal box is marked invalid', async () => {
      await page.locator('#pace').tap();

      await page.keyboard.type('75');

      const invalid = {
        time: await page.locator('#time').getAttribute('aria-invalid'),
        pace: await page.locator('#pace').getAttribute('aria-invalid'),
      };
      assert.deepEqual(invalid, { time: null, pace: 'true' });
    });

    test('the Spanish page tags the boxes in Spanish after a swap', async () => {
      const es = await openPage(browser!, site, 'es');
      await es.locator('#pace').tap();

      await es.keyboard.press('4');

      const tags = { time: await tagText(es, 'time'), pace: await tagText(es, 'pace') };
      await es.context().close();
      assert.deepEqual(tags, { time: 'Calculado', pace: 'Tu objetivo' });
    });

    for (const width of [781, DESKTOP.width]) {
      test(`a screen ${width} px wide shows the splits beside the goal`, async () => {
        await page.setViewportSize({ width, height: 900 });

        const goal = await page.locator('.col').boundingBox();
        const splits = await page.locator('.splits').boundingBox();

        assert.ok(
          splits!.x >= goal!.x + goal!.width,
          `goal ${goal!.x}+${goal!.width}, splits ${splits!.x}`,
        );
      });
    }

    test('the world records sit between the boxes and the splits', async () => {
      const top = (selector: string) =>
        page.locator(selector).evaluate((element) => element.getBoundingClientRect().top);

      const order = {
        boxes: await top('.boxes'),
        records: await top('section[aria-labelledby=records]'),
        splits: await top('.splits'),
      };

      assert.ok(
        order.boxes < order.records && order.records < order.splits,
        `top of boxes, records and splits: ${JSON.stringify(order)}`,
      );
    });

    test('a screen 780 px wide shows the splits under the world records', async () => {
      await page.setViewportSize({ width: 780, height: 900 });

      const records = await page.locator('section[aria-labelledby=records]').boundingBox();
      const splits = await page.locator('.splits').boundingBox();

      assert.ok(
        splits!.y >= records!.y + records!.height,
        `records ${records!.y}+${records!.height}, splits ${splits!.y}`,
      );
    });

    test("a marathon's splits scroll inside their card on a wide screen", async () => {
      await page.setViewportSize(DESKTOP);

      await page.locator('[value="marathon"]').click();

      const box = await scrollBox(page);
      assert.ok(
        box.scrollHeight > box.clientHeight && box.clientHeight <= 600,
        `${box.scrollHeight} px of splits in a ${box.clientHeight} px box`,
      );
    });

    test("the splits' header row stays in view at the end of a marathon on a wide screen", async () => {
      await page.setViewportSize(DESKTOP);
      await page.locator('[value="marathon"]').click();

      await page.locator('tbody tr').last().scrollIntoViewIfNeeded();

      const header = await page.locator('th').first().boundingBox();
      const box = await page.locator('.scroll').boundingBox();
      assert.ok(
        header!.y >= 0 && Math.abs(header!.y - box!.y) < 1,
        `header at ${header!.y}, box at ${box!.y}`,
      );
    });

    test("the boxes stay in view at the end of a marathon's splits on a wide screen", async () => {
      await page.setViewportSize(DESKTOP);
      await page.locator('[value="marathon"]').click();

      await page.locator('tbody tr').last().scrollIntoViewIfNeeded();

      const boxes = await page.locator('.boxes').boundingBox();
      assert.ok(
        boxes!.y >= 0 && boxes!.y + boxes!.height <= DESKTOP.height,
        `boxes at ${boxes!.y}+${boxes!.height}`,
      );
    });

    test("a marathon's splits do not scroll inside their card on a narrow screen", async () => {
      await page.locator('[value="marathon"]').click();

      const box = await scrollBox(page);
      assert.ok(
        box.scrollHeight <= box.clientHeight,
        `${box.scrollHeight} px of splits in a ${box.clientHeight} px box`,
      );
    });

    test('Tab from the pace box reaches the splits on a wide screen', async () => {
      await page.setViewportSize(DESKTOP);
      await page.locator('#pace').focus();

      await page.keyboard.press('Tab');

      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('aria-labelledby')),
        'splits',
      );
    });

    test('the splits scroll box is a region named Splits', async () => {
      assert.equal(await page.getByRole('region', { name: 'Splits', exact: true }).count(), 1);
    });

    test('the calculator is a region named Calculator', async () => {
      assert.equal(await page.getByRole('region', { name: 'Calculator', exact: true }).count(), 1);
    });

    test("a marathon's 5th km and final partial km are shaded and the 6th is not", async () => {
      await page.locator('[value="marathon"]').click();

      const shading = {
        5: await totalCellStyle(page, 5, 'background-color'),
        6: await totalCellStyle(page, 6, 'background-color'),
        43: await totalCellStyle(page, 43, 'background-color'),
      };
      assert.deepEqual(shading, {
        5: 'rgb(241, 241, 238)',
        6: 'rgba(0, 0, 0, 0)',
        43: 'rgb(241, 241, 238)',
      });
    });

    test("a marathon's 5th km and final partial km have a bold total and the 6th does not", async () => {
      await page.locator('[value="marathon"]').click();

      const weights = {
        5: await totalCellStyle(page, 5, 'font-weight'),
        6: await totalCellStyle(page, 6, 'font-weight'),
        43: await totalCellStyle(page, 43, 'font-weight'),
      };
      assert.deepEqual(weights, { 5: '600', 6: '400', 43: '600' });
    });

    test('the splits are marked as even pace', async () => {
      assert.ok(await page.getByText('Even pace', { exact: true }).isVisible(), 'no Even pace');
    });

    test('the Spanish page marks the splits as even pace in Spanish', async () => {
      const spanish = await openPage(browser!, site, 'es');

      const visible = await spanish.getByText('Ritmo constante', { exact: true }).isVisible();

      await spanish.context().close();
      assert.ok(visible, 'no Ritmo constante');
    });

    test('the page is headed for screen readers as a pace, finish time and splits calculator', async () => {
      const heading = page.getByRole('heading', {
        level: 1,
        name: 'Running calculator: pace, finish time and 1 km splits',
        exact: true,
      });

      assert.equal(await heading.count(), 1);
    });

    test('the Spanish page is headed for screen readers in Spanish', async () => {
      const spanish = await openPage(browser!, site, 'es');

      const count = await spanish.getByRole('heading', {
        level: 1,
        name: 'Calculadora de ritmo: tiempo final y parciales de 1 km',
        exact: true,
      }).count();

      await spanish.context().close();
      assert.equal(count, 1);
    });

    test('the Running tools link goes to the page of its language', async () => {
      const link = page.getByRole('link', { name: 'Running tools', exact: true });

      assert.equal(await link.getAttribute('href'), './');
    });

    test('a dark colour scheme shows the dark page and accent', async () => {
      await page.emulateMedia({ colorScheme: 'dark' });

      const colours = {
        page: await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
        goal: await colour(page, '#time-tag'),
      };
      assert.deepEqual(colours, { page: 'rgb(15, 15, 14)', goal: 'rgb(255, 138, 80)' });
    });

    test("on a 390 px screen a record's pace sits beside its time", async () => {
      const time = await page.locator('.men .time').boundingBox();
      const pace = await page.locator('.men .time + dd').boundingBox();

      assert.ok(
        pace!.x >= time!.x + time!.width,
        `time ${time!.x}+${time!.width}, pace ${pace!.x}`,
      );
    });

    test("on a 320 px screen a record's pace sits under its time", async () => {
      await page.setViewportSize({ width: 320, height: 640 });

      const time = await page.locator('.men .time').boundingBox();
      const pace = await page.locator('.men .time + dd').boundingBox();

      assert.ok(
        pace!.x === time!.x && pace!.y >= time!.y + time!.height,
        `time at ${time!.x},${time!.y}+${time!.height}, pace at ${pace!.x},${pace!.y}`,
      );
    });

    for (const width of [320, 390, 780, 781, 1280]) {
      test(`the Spanish page does not scroll sideways at ${width} px`, async () => {
        const spanish = await openPage(browser!, site, 'es');

        await spanish.setViewportSize({ width, height: 800 });

        const { scrollWidth, clientWidth } = await spanish.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        await spanish.context().close();
        assert.ok(scrollWidth <= clientWidth, `${scrollWidth} px of page in ${clientWidth} px`);
      });
    }

    for (const { preset, en } of RECORDS) {
      test(`the ${preset} shows its men's and women's world records`, async () => {
        await page.locator(`[value="${preset}"]`).click();

        assert.deepEqual(await records(page), en);
      });

      test(`the Spanish page shows the ${preset} world records in Spanish`, async () => {
        const spanish = await openPage(browser!, site, 'es');

        await spanish.locator(`[value="${preset}"]`).click();

        const shown = await records(spanish);
        await spanish.context().close();
        assert.deepEqual(shown, inSpanish(en));
      });
    }

    test('the world records follow the distance while the goal is empty', async () => {
      await page.locator('#time').fill('');

      await page.locator('[value="marathon"]').click();

      assert.deepEqual(await records(page), RECORDS[3].en);
    });

    test('the world records follow the distance while the goal is out of range', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.type('060');

      await page.locator('[value="5k"]').click();

      assert.deepEqual(await records(page), RECORDS[0].en);
    });

    test('the Spanish distances fit their column on a 320 px screen', async () => {
      const spanish = await openPage(browser!, site, 'es');
      await spanish.setViewportSize({ width: 320, height: 640 });

      const { scrollWidth, clientWidth } = await spanish.locator('.picker').evaluate((picker) => ({
        scrollWidth: picker.scrollWidth,
        clientWidth: picker.clientWidth,
      }));

      await spanish.context().close();
      assert.ok(scrollWidth <= clientWidth, `${scrollWidth} px of distances in ${clientWidth} px`);
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`in a ${scheme} scheme the selected distance is ringed like the boxes and the others are not`, async () => {
        await page.emulateMedia({ colorScheme: scheme });

        const edge = await page.locator('.pairs').first().evaluate((box) =>
          getComputedStyle(box).borderTopColor
        );
        const rings = await page.locator('.picker label').evaluateAll((labels) =>
          labels.map((label) => getComputedStyle(label).boxShadow)
        );

        assert.deepEqual(
          rings.map((ring) => ring.includes(`${edge} 0px 0px 0px 1px`)),
          [false, true, false, false],
          `box border ${edge}, distance shadows ${JSON.stringify(rings)}`,
        );
      });
    }

    for (const width of [390, DESKTOP.width]) {
      test(`on a ${width} px screen the Spanish half marathon fits its distance on one line`, async () => {
        const spanish = await openPage(browser!, site, 'es');
        await spanish.setViewportSize({ width, height: 800 });

        await spanish.locator('[value="half"]').click();

        // A range over the text has one box per line; the label itself is one box however it wraps.
        const lines = await spanish.locator('label:has([value="half"]) span').evaluate((label) => {
          const text = document.createRange();
          text.selectNodeContents(label);
          return text.getClientRects().length;
        });
        await spanish.context().close();
        assert.equal(lines, 1);
      });
    }

    test('an arrow key from a distance focused with Tab shows the focus ring on the next one', async () => {
      await page.locator('#time').focus();
      // WebKit, like Safari by default, tabs only to text fields unless Option is held.
      await page.keyboard.press(type === webkit ? 'Alt+Shift+Tab' : 'Shift+Tab');

      await page.keyboard.press('ArrowRight');

      const focused = await page.evaluate(() => {
        const radio = document.activeElement as HTMLInputElement;
        return { value: radio.value, outline: getComputedStyle(radio).outlineStyle };
      });
      assert.deepEqual(focused, { value: 'half', outline: 'solid' });
    });

    test('the finish time box focused with Tab is drawn in the accent with a ring', async () => {
      await page.locator('[value=marathon]').focus();

      await page.keyboard.press('Tab');

      const look = await page.locator('.clock:has(#time) .pairs').evaluate((box) => ({
        border: getComputedStyle(box).borderTopColor,
        ringed: getComputedStyle(box).boxShadow !== 'none',
      }));
      assert.deepEqual(look, { border: await colour(page, '#time-tag'), ringed: true });
    });

    test('an out of range finish time keeps its box in the accent after leaving it', async () => {
      await page.locator('#time').tap();
      await page.keyboard.type('99');

      await page.locator('#time').blur();

      const border = await page.locator('.clock:has(#time) .pairs').evaluate((box) =>
        getComputedStyle(box).borderTopColor
      );
      assert.equal(border, await colour(page, '#time-tag'));
    });

    for (const box of BOXES) {
      describe(`${box.kind} box`, () => {
        const id = `#${box.kind}`;

        test('tapping a filled box highlights its value', async () => {
          await page.locator(id).tap();

          await boxHighlighted(page, true, box.kind);
        });

        test(`tapping ${box.text} and typing 4500 shows ${box.typed}`, async () => {
          const field = page.locator(id);
          await field.tap();

          await field.pressSequentially('4500');

          assert.equal(await boxText(page, box.kind), box.typed);
        });

        test('the first key clears the highlight', async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await page.keyboard.press('4');

          await boxHighlighted(page, false, box.kind);
        });

        test('tapping a box being typed in highlights it again', async () => {
          const field = page.locator(id);
          await field.tap();
          await page.keyboard.press('4');

          await field.tap();

          await boxHighlighted(page, true, box.kind);
        });

        test('tapping a highlighted box again still replaces the value', async () => {
          const field = page.locator(id);
          await field.tap();
          await boxHighlighted(page, true, box.kind);
          await field.tap();

          await page.keyboard.press('4');

          assert.equal(await field.inputValue(), '4');
        });

        test('tapping a box focused with Tab highlights its value', async () => {
          const field = page.locator(id);
          await page.locator(box.tabFrom).focus();
          await page.keyboard.press('Tab');

          await field.tap();

          await boxHighlighted(page, true, box.kind);
        });

        test('a highlighted box shows no caret', async () => {
          await page.locator(id).tap();

          await boxHighlighted(page, true, box.kind);

          assert.equal(await page.locator('.caret:visible').count(), 0, 'caret shown');
        });

        test('a box being typed in shows a caret', async () => {
          await page.locator(id).tap();

          await page.keyboard.press('4');

          assert.equal(
            await page.locator(`.clock:has(${id}) .caret:visible`).count(),
            1,
            'caret not shown',
          );
        });

        test('a box without focus shows no caret', async () => {
          assert.equal(
            await page.locator(`.clock:has(${id}) .caret:visible`).count(),
            0,
            'caret shown',
          );
        });

        test('leaving a highlighted box removes the highlight', async () => {
          const field = page.locator(id);
          await field.tap();
          await boxHighlighted(page, true, box.kind);

          await field.blur();

          await boxHighlighted(page, false, box.kind);
        });

        test('Backspace on a highlighted value leaves an empty box with a caret', async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await page.keyboard.press('Backspace');

          assert.equal(
            await page.locator(`.clock:has(${id}) .caret:visible`).count(),
            1,
            'caret not shown',
          );
        });

        test('Backspace on a highlighted value leaves an empty box without a highlight', async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await page.keyboard.press('Backspace');

          await boxHighlighted(page, false, box.kind);
        });

        test(`pasting 4:30 over a highlighted value shows ${box.pasted}`, async () => {
          await page.locator(id).tap();

          await page.keyboard.insertText('4:30');

          assert.equal(await boxText(page, box.kind), box.pasted);
        });

        test('pasting at the caret keeps only the digits that fit', async () => {
          const field = page.locator(id);
          await field.tap();
          await field.pressSequentially(box.atCaret);

          await page.keyboard.insertText('4:30');

          assert.equal(await field.inputValue(), box.pastedAtCaret);
        });

        test('pasting text with no digits keeps the value', async () => {
          await page.locator(id).tap();

          await page.keyboard.insertText('abc');

          assert.equal(await boxText(page, box.kind), box.text);
        });

        test('a letter on a highlighted box keeps the value', async () => {
          await page.locator(id).tap();

          await page.keyboard.press('a');

          assert.equal(await boxText(page, box.kind), box.text);
        });

        test('composing a word over a highlighted value keeps the value', {
          skip: noIme,
        }, async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await compose(page, ['k', 'か'], 'か');

          assert.equal(await boxText(page, box.kind), box.text);
        });

        test('composing full-width digits over a highlighted value keeps the value', {
          skip: noIme,
        }, async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await compose(page, ['４', '４５'], '４５');

          assert.equal(await boxText(page, box.kind), box.text);
        });

        test('cancelling a composition over a highlighted value keeps the value', {
          skip: noIme,
        }, async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await compose(page, ['あ'], '');

          assert.equal(await boxText(page, box.kind), box.text);
        });

        test('composing digits over a highlighted value replaces it', {
          skip: noIme,
        }, async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);

          await compose(page, ['4', '45'], '45');

          assert.equal(await page.locator(id).inputValue(), '45');
        });

        test('digits composed at the caret are added once', { skip: noIme }, async () => {
          await page.locator(id).tap();
          await page.keyboard.press('4');

          await compose(page, ['4', '45'], '45');

          assert.equal(await page.locator(id).inputValue(), '445');
        });

        test('a word composed at the caret is dropped', { skip: noIme }, async () => {
          await page.locator(id).tap();
          await page.keyboard.press('4');

          await compose(page, ['k', 'か'], 'か');

          assert.equal(await page.locator(id).inputValue(), '4');
        });

        test('a caret moved before the digits goes back to the end', async () => {
          await page.locator(id).tap();
          await boxHighlighted(page, true, box.kind);
          await page.keyboard.press('ArrowLeft');

          await page.keyboard.press('1');

          assert.equal(await page.locator(id).inputValue(), box.plusOne);
        });

        test('a digit typed straight after moving the caret goes after the digits', async () => {
          const field = page.locator(id);
          await field.tap();
          await field.pressSequentially(box.atCaret);
          await page.keyboard.press('ArrowLeft');

          await page.keyboard.press('1');

          assert.equal(await field.inputValue(), box.plusOne);
        });

        test('Backspace straight after moving the caret removes the last digit', async () => {
          const field = page.locator(id);
          await field.tap();
          await field.pressSequentially('1234');
          await page.keyboard.press('ArrowLeft');

          await page.keyboard.press('Backspace');

          assert.equal(await field.inputValue(), '123');
        });
      });
    }
  });
}
