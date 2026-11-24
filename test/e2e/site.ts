// Serves the built site/ to the browser tests, and opens it in a browser that can reach nothing
// else. Run `npm run build` first.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from 'playwright';
import type { Goal } from '../../src/pace.ts';
import type { Locale } from '../../src/strings.ts';

export interface Site {
  origin: string;
  close(): Promise<void>;
}

const ROOT = fileURLToPath(new URL('../../site/', import.meta.url));
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

/** site/ on 127.0.0.1 at a free port, so nothing outside this machine can reach it. */
export async function serveSite(): Promise<Site> {
  const server = createServer(async (request, response) => {
    try {
      const path = normalize(decodeURIComponent(new URL(request.url!, 'http://x').pathname));
      const file = join(ROOT, path.endsWith('/') ? `${path}index.html` : path);
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** The locale's page on a phone-sized touch screen. Every request to another origin fails. */
export async function openPage(browser: Browser, site: Site, locale: Locale = 'en'): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  await context.route(
    '**/*',
    (route) =>
      new URL(route.request().url()).origin === site.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  await page.goto(`${site.origin}/${locale}/`);
  return page;
}

/**
 * Resolves once the box shows as highlighted, or with `false` once it shows as not, and throws if
 * it never does. Browsers report selection changes a moment late.
 */
export async function boxHighlighted(
  page: Page,
  highlighted: boolean,
  kind: Goal['kind'],
): Promise<void> {
  await page.waitForFunction(
    ([highlighted, kind]) => {
      const digits = [
        ...document.querySelectorAll(`.clock:has(#${kind}) .pair > :first-child > :last-child`),
      ];
      return (getComputedStyle(digits.at(-1)!).backgroundColor !== 'rgba(0, 0, 0, 0)')
        === highlighted;
    },
    [highlighted, kind] as const,
    { timeout: 2000 },
  ).catch(() => {
    throw new Error(`${kind} box ${highlighted ? 'never highlighted' : 'still highlighted'}`);
  });
}

/**
 * Types into the focused field through an input method, as a Japanese keyboard does: each of
 * `updates` replaces the text being composed, then `commit` ends the composition with that text,
 * or cancels it when empty. Without `commit` the composition stays open. Chromium only.
 */
export async function compose(page: Page, updates: string[], commit?: string): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  for (const text of updates) {
    await cdp.send('Input.imeSetComposition', {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
  if (commit === undefined) {
    return;
  }
  await (commit
    ? cdp.send('Input.insertText', { text: commit })
    : cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 }));
}

/** The digits a box shows, as the user reads them: '00:45:00', or '04:30' for a pace. */
export async function boxText(page: Page, kind: Goal['kind'] = 'time'): Promise<string> {
  const pairs = await page.locator(`.clock:has(#${kind}) .pair > :first-child`).allTextContents();
  return pairs.join(':');
}

/** The tag over a box: "Your goal" or "Calculated". */
export async function tagText(page: Page, kind: Goal['kind']): Promise<string | null> {
  return page.locator(`#${kind}-tag`).textContent();
}

/** The computed text colour of the last element matching `selector`. */
export async function colour(page: Page, selector: string): Promise<string> {
  return page.locator(selector).last().evaluate((element) => getComputedStyle(element).color);
}

/** What a screen reader reads as the box's description: each described element's text in order. */
export async function description(page: Page, kind: Goal['kind']): Promise<string> {
  return page.locator(`#${kind}`).evaluate((field) =>
    field.getAttribute('aria-describedby')!.split(' ')
      .map((id) => document.getElementById(id)!.textContent)
      .filter(Boolean)
      .join(' ')
  );
}

/** The cells of the splits table's last row. */
export async function lastSplit(page: Page): Promise<string[]> {
  return page.locator('tbody tr').last().locator('td').allTextContents();
}

/** The world records block as read: its heading, then each entry's label and values in order. */
export async function records(page: Page): Promise<string[][]> {
  const section = page.locator('section');
  return [
    [(await section.locator('h2').textContent())!],
    await section.locator('.men > *').allTextContents(),
    await section.locator('.women > *').allTextContents(),
  ];
}
