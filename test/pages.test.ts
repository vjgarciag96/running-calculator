import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { page, rootPage } from '../scripts/pages.ts';
import { STRINGS } from '../src/strings.ts';

const template = readFileSync(new URL('../src/page.html', import.meta.url), 'utf8');

test('page puts the locale, title and description in the head', () => {
  const html = page(template, 'es');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>Calculadora de ritmo<\/title>/);
  assert.ok(html.includes(`<meta name="description" content="${STRINGS.es.description}">`));
});

test('page fills every data-t with the locale text', () => {
  const html = page(template, 'es');
  assert.doesNotMatch(html, /data-t=/);
  assert.match(html, /<legend>Distancia<\/legend>/);
  assert.match(html, /<span>Media maratón<\/span>/);
});

test('page fails on a data-t with no string', () => {
  assert.throws(() => page('<p data-t="nope">x</p>', 'en'), /nope/);
});

test('pages link to each other when the origin is known', () => {
  const html = page(template, 'es', 'https://example.com');
  assert.ok(html.includes('<link rel="canonical" href="https://example.com/es/">'));
  assert.ok(html.includes('<link rel="alternate" hreflang="en" href="https://example.com/en/">'));
  assert.ok(
    html.includes('<link rel="alternate" hreflang="x-default" href="https://example.com/">'),
  );
  assert.ok(
    rootPage('https://example.com').includes('<link rel="canonical" href="https://example.com/">'),
  );
});

test('without the origin there are no links to alternates', () => {
  assert.ok(!page(template, 'en').includes('hreflang'));
});

test('without scripts the root page lists each language by its own name', () => {
  const html = rootPage();
  assert.ok(html.includes('<li><a href="en/" hreflang="en" lang="en">English</a></li>'));
  assert.ok(html.includes('<li><a href="es/" hreflang="es" lang="es">Español</a></li>'));
});
