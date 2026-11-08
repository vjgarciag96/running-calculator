// Serves the built site/ to the browser tests, and opens it in a browser that can reach nothing
// else. Run `npm run build` first.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from 'playwright';

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

/** The English page on a phone-sized touch screen. Every request to another origin fails. */
export async function openPage(browser: Browser, site: Site): Promise<Page> {
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
  await page.goto(`${site.origin}/en/`);
  return page;
}

/** Resolves once the goal box is highlighted, and throws if it never is. Browsers report selection changes a moment late. */
export async function boxHighlighted(page: Page): Promise<void> {
  await page.locator('.clock.selected').waitFor({ state: 'attached', timeout: 2000 });
}

/** The digits the goal box shows, as the user reads them: '00:45:00', or '04:30' for a pace. */
export async function boxText(page: Page): Promise<string> {
  const pairs = await page.locator('.pair:visible > :first-child').allTextContents();
  return pairs.join(':');
}
