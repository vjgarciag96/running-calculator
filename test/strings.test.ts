import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickLocale, STRINGS } from '../src/strings.ts';

test('pickLocale takes the first browser language we support', () => {
  assert.equal(pickLocale(['es-ES', 'en']), 'es');
  assert.equal(pickLocale(['fr', 'es-MX']), 'es');
  assert.equal(pickLocale(['ES']), 'es');
  assert.equal(pickLocale(['en-GB', 'es']), 'en');
});

test('pickLocale falls back to English', () => {
  assert.equal(pickLocale(['fr']), 'en');
  assert.equal(pickLocale([]), 'en');
});

test('every locale has text for every key', () => {
  for (const [locale, messages] of Object.entries(STRINGS)) {
    for (const [key, text] of Object.entries(messages)) {
      assert.ok(text.trim() !== '', `${locale}.${key}`);
    }
  }
});
