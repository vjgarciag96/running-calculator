import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatDuration } from '../src/pace.ts';

test('parseDuration reads m:ss and h:mm:ss', () => {
  assert.deepEqual(parseDuration('50:00'), { ok: true, value: 3000 });
  assert.deepEqual(parseDuration('1:34:56'), { ok: true, value: 5696 });
  assert.deepEqual(parseDuration(' 4:30 '), { ok: true, value: 270 });
});

test('parseDuration rejects bad input with a typed error', () => {
  assert.deepEqual(parseDuration('5:75'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('1:60:00'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('0:00'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('abc'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('1:2:3:4'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration(''), { ok: false, error: 'empty' });
  assert.deepEqual(parseDuration('   '), { ok: false, error: 'empty' });
});

test('formatDuration rounds to the second', () => {
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(3000), '50:00');
  assert.equal(formatDuration(5696.19), '1:34:56');
  assert.equal(formatDuration(26.19), '0:26');
});
