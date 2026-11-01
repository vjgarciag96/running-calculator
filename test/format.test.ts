import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/format.ts';

test('parseDuration reads m:ss and h:mm:ss', () => {
  assert.deepEqual(parseDuration('50:00'), { ok: true, value: 3000 });
  assert.deepEqual(parseDuration('1:34:56'), { ok: true, value: 5696 });
  assert.deepEqual(parseDuration('10:00:00'), { ok: true, value: 36000 });
  assert.deepEqual(parseDuration(' 4:30 '), { ok: true, value: 270 });
  assert.deepEqual(parseDuration('90:00'), { ok: true, value: 5400 });
  assert.deepEqual(parseDuration('100:00'), { ok: true, value: 6000 });
});

test('parseDuration rejects bad input with a typed error', () => {
  assert.deepEqual(parseDuration('5:75'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('4:60'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('1:60:00'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('0:00'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('abc'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('4.30'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('1:02:03:04'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration(''), { ok: false, error: 'empty' });
  assert.deepEqual(parseDuration('   '), { ok: false, error: 'empty' });
});

test('parseDuration needs two digits after each colon', () => {
  assert.deepEqual(parseDuration('4:3'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('4:300'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('1:2:03'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('1:02:3'), { ok: false, error: 'malformed' });
  assert.deepEqual(parseDuration('4:03'), { ok: true, value: 243 });
});

test('parseDuration reads bare digits filled from the right', () => {
  assert.deepEqual(parseDuration('45'), { ok: true, value: 45 });
  assert.deepEqual(parseDuration('430'), { ok: true, value: 270 });
  assert.deepEqual(parseDuration('5000'), { ok: true, value: 3000 });
  assert.deepEqual(parseDuration('9000'), { ok: true, value: 5400 });
  assert.deepEqual(parseDuration('13456'), { ok: true, value: 5696 });
  assert.deepEqual(parseDuration('100000'), { ok: true, value: 36000 });
  assert.deepEqual(parseDuration(' 430 '), { ok: true, value: 270 });
});

test('bare digits follow the same range rules as colons', () => {
  assert.deepEqual(parseDuration('575'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('19000'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('0'), { ok: false, error: 'out-of-range' });
  assert.deepEqual(parseDuration('000'), { ok: false, error: 'out-of-range' });
});

test('formatDuration rounds to the second', () => {
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(3000), '50:00');
  assert.equal(formatDuration(5696.19), '1:34:56');
  assert.equal(formatDuration(3723), '1:02:03');
  assert.equal(formatDuration(3599.6), '1:00:00');
  assert.equal(formatDuration(26.19), '0:26');
});
