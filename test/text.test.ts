import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration, parseKm, parsePace } from '../src/text.ts';

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

test('parsePace reads a pace with the same rules as a duration', () => {
  assert.deepEqual(parsePace('4:30'), { ok: true, value: 270 });
  assert.deepEqual(parsePace('5:75'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parsePace(''), { ok: false, error: 'empty' });
});

test('formatDuration rounds to the second', () => {
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(3000), '50:00');
  assert.equal(formatDuration(5696.19), '1:34:56');
  assert.equal(formatDuration(26.19), '0:26');
});

test('parseKm converts decimal km to whole metres', () => {
  assert.deepEqual(parseKm('10'), { ok: true, value: 10000 });
  assert.deepEqual(parseKm('21.0975'), { ok: true, value: 21098 });
  assert.deepEqual(parseKm('21,1'), { ok: true, value: 21100 });
  assert.deepEqual(parseKm(' 5 '), { ok: true, value: 5000 });
});

test('parseKm rejects bad input with a typed error', () => {
  assert.deepEqual(parseKm('0'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseKm('-5'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseKm('abc'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseKm('1e3'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseKm(''), { ok: false, error: 'empty' });
});
