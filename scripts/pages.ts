// Writes one page per language from src/page.html, plus a root page that sends visitors to
// theirs. Search engines only see the text that is in the HTML, so each language needs a
// page of its own. Run after tsc: `node scripts/pages.ts`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { type Locale, type Messages, STRINGS } from '../src/strings.ts';

const LOCALES = Object.keys(STRINGS) as Locale[];

/** The template with every data-t filled in from the locale's strings. */
export function page(template: string, locale: Locale, origin?: string): string {
  const t: Messages = STRINGS[locale];
  return template
    .replace('<html lang="en">', `<html lang="${locale}">`)
    .replace(
      '<meta name="description" content="">',
      `<meta name="description" content="${escape(t.description)}">`,
    )
    .replace('</head>', `${alternates(origin, `${locale}/`)}</head>`)
    .replace(
      /<(\w+)([^>]*?) data-t="([^"]*)"([^>]*)>[^<]*<\/\1>/g,
      (_, tag, before, key, after) => {
        if (!Object.hasOwn(t, key)) {
          throw new Error(`page.html: no string for data-t="${key}"`);
        }
        return `<${tag}${before}${after}>${escape(t[key as keyof Messages])}</${tag}>`;
      },
    );
}

/** The page at /: it redirects by browser language, and offers links when scripts are off. */
export function rootPage(origin?: string): string {
  const items = LOCALES.map((locale) =>
    `<li><a href="${locale}/" hreflang="${locale}" lang="${locale}">${
      languageName(locale)
    }</a></li>`
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${STRINGS.en.title}</title>
  <link rel="icon" href="icon.svg" type="image/svg+xml">
  <script type="module" src="redirect.js"></script>
${alternates(origin, '')}</head>
<body>
  <noscript><ul>${items.join('')}</ul></noscript>
</body>
</html>
`;
}

/** The language's name in itself, capitalised for a link: 'English', 'Español'. */
function languageName(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale)!;
  return name[0].toLocaleUpperCase(locale) + name.slice(1);
}

// Tells search engines which page is which language. They want absolute URLs, so the links are
// only written when the build knows the site's origin, from SITE_URL.
function alternates(origin: string | undefined, path: string): string {
  if (origin === undefined) {
    return '';
  }
  const links = [
    `<link rel="canonical" href="${origin}/${path}">`,
    ...LOCALES.map((locale) =>
      `<link rel="alternate" hreflang="${locale}" href="${origin}/${locale}/">`
    ),
    `<link rel="alternate" hreflang="x-default" href="${origin}/">`,
  ];
  return links.map((link) => `  ${link}\n`).join('');
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

if (import.meta.filename === process.argv[1]) {
  const origin = process.env.SITE_URL?.replace(/\/$/, '');
  const template = readFileSync('src/page.html', 'utf8');
  for (const locale of LOCALES) {
    mkdirSync(`site/${locale}`, { recursive: true });
    writeFileSync(`site/${locale}/index.html`, page(template, locale, origin));
  }
  writeFileSync('site/index.html', rootPage(origin));
}
