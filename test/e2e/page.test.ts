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
  serveSite,
  type Site,
  tagText,
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

// A laptop's window, wide enough for the splits beside the goal and tall enough to keep it in view.
const DESKTOP = { width: 1440, height: 900 };

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

      assert.equal(
        await description(page, 'time'),
        'Calculated Change either one and the other follows. Your goal stays put when you switch distance.',
      );
    });

    test('each box describes its value as a time, with its tag and the help', async () => {
      const described = {
        time: await description(page, 'time'),
        pace: await description(page, 'pace'),
      };

      assert.deepEqual(described, {
        time:
          '50:00 Your goal Change either one and the other follows. Your goal stays put when you switch distance.',
        pace:
          '5:00 /km Calculated Change either one and the other follows. Your goal stays put when you switch distance.',
      });
    });

    test('a swap and a distance switch update what each box describes', async () => {
      await page.locator('#pace').tap();
      await page.keyboard.type('430');

      await page.getByRole('radio', { name: 'Half' }).click();

      const described = {
        time: await description(page, 'time'),
        pace: await description(page, 'pace'),
      };
      assert.deepEqual(described, {
        time:
          '1:34:56 Calculated Change either one and the other follows. Your goal stays put when you switch distance.',
        pace:
          '4:30 /km Your goal Change either one and the other follows. Your goal stays put when you switch distance.',
      });
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
        time: 'time-value time-tag help',
        pace: 'pace-value pace-tag help message',
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

    test('a wide screen shows the splits beside the goal', async () => {
      await page.setViewportSize(DESKTOP);

      const goal = await page.locator('.controls').boundingBox();
      const splits = await page.locator('table').boundingBox();

      assert.ok(
        splits!.x >= goal!.x + goal!.width,
        `goal ${goal!.x}+${goal!.width}, splits ${splits!.x}`,
      );
    });

    test("the goal stays in view at the end of a marathon's splits on a wide screen", async () => {
      await page.setViewportSize(DESKTOP);
      await page.locator('[value="marathon"]').click();

      await page.locator('tbody tr').last().scrollIntoViewIfNeeded();

      const goal = await page.locator('.controls').boundingBox();
      assert.ok(
        goal!.y >= 0 && goal!.y + goal!.height <= DESKTOP.height,
        `goal at ${goal!.y}+${goal!.height}`,
      );
    });

    test('on a wide but short window the goal scrolls away instead of being cut off', async () => {
      await page.setViewportSize({ width: DESKTOP.width, height: 700 });
      await page.locator('[value="marathon"]').click();

      await page.locator('tbody tr').nth(20).scrollIntoViewIfNeeded();

      const goal = await page.locator('.controls').boundingBox();
      assert.ok(goal!.y < 0, `goal at ${goal!.y}`);
    });

    test('the world records sit between the boxes and the splits', async () => {
      const top = (selector: string) =>
        page.locator(selector).evaluate((element) => element.getBoundingClientRect().top);

      const order = {
        boxes: await top('.boxes'),
        records: await top('section'),
        splits: await top('table'),
      };

      assert.ok(
        order.boxes < order.records && order.records < order.splits,
        `top of boxes, records and splits: ${JSON.stringify(order)}`,
      );
    });

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
