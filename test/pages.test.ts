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

test('page has no mode toggle, Goal legend or results block', () => {
  const html = page(template, 'es');

  assert.doesNotMatch(html, /name="mode"/, 'mode toggle');
  assert.doesNotMatch(html, /<legend>Objetivo<\/legend>/, 'Goal legend');
  assert.doesNotMatch(html, /<output/, 'results block');
});

test('the Spanish page labels and tags both boxes', () => {
  const html = page(template, 'es');

  assert.match(
    html,
    /<label for="time">Tiempo final<\/label><span id="time-tag" class="tag">Tu objetivo<\/span>/,
  );
  assert.match(
    html,
    /<label for="pace">Ritmo por km<\/label><span id="pace-tag" class="tag">Calculado<\/span>/,
  );
});

test('the English page labels and tags both boxes', () => {
  const html = page(template, 'en');

  assert.match(
    html,
    /<label for="time">Finish time<\/label><span id="time-tag" class="tag">Your goal<\/span>/,
  );
  assert.match(
    html,
    /<label for="pace">Pace per km<\/label><span id="pace-tag" class="tag">Calculated<\/span>/,
  );
});

test('the English page has a hidden heading that names the calculator', () => {
  const html = page(template, 'en');

  assert.match(
    html,
    /<h1 class="sr">Running calculator: pace, finish time and 1 km splits<\/h1>/,
  );
});

test('the Spanish page has a hidden heading that names the calculator', () => {
  const html = page(template, 'es');

  assert.match(html, /<h1 class="sr">Calculadora de ritmo: tiempo final y parciales de 1 km<\/h1>/);
});

test('page has no help line', () => {
  const html = page(template, 'en');

  assert.doesNotMatch(html, /id="help"/);
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
