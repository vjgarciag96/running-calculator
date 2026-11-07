import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatDuration,
  formatKm,
  keepDigits,
  parseDuration,
  parsePace,
  toPairs,
} from '../src/format.ts';
import type { Meters } from '../src/pace.ts';

test('keepDigits drops everything that is not a digit', () => {
  assert.equal(keepDigits(' 4:30 ', 'time'), '430');
});

test('keepDigits keeps the first six digits of a finish time', () => {
  assert.equal(keepDigits('1234567', 'time'), '123456');
});

test('keepDigits keeps the first four digits of a pace', () => {
  assert.equal(keepDigits('12345', 'pace'), '1234');
});

test('toPairs fills a finish time from the right', () => {
  assert.deepEqual(toPairs('4500', 'time'), ['00', '45', '00']);
});

test('toPairs fills a pace from the right', () => {
  assert.deepEqual(toPairs('430', 'pace'), ['04', '30']);
});

test('toPairs shows only the first digits that fit', () => {
  assert.deepEqual(toPairs('1234567', 'time'), ['12', '34', '56']);
});

test('toPairs shows all zeros for no digits', () => {
  assert.deepEqual(toPairs('', 'time'), ['00', '00', '00']);
});

test('parseDuration reads the digits as hh:mm:ss', () => {
  assert.deepEqual(parseDuration('13456'), { ok: true, value: 5696 });
});

test('parseDuration reads up to 99:59:59', () => {
  assert.deepEqual(parseDuration('995959'), { ok: true, value: 359999 });
});

test('parseDuration rejects 60 seconds or more', () => {
  assert.deepEqual(parseDuration('575'), { ok: false, error: 'out-of-range' });
});

test('parseDuration rejects 60 minutes or more', () => {
  assert.deepEqual(parseDuration('9000'), { ok: false, error: 'out-of-range' });
});

test('parseDuration rejects a time of zero', () => {
  assert.deepEqual(parseDuration('000'), { ok: false, error: 'out-of-range' });
});

test('parseDuration of no digits is empty', () => {
  assert.deepEqual(parseDuration(''), { ok: false, error: 'empty' });
});

test('parsePace reads the digits as mm:ss', () => {
  assert.deepEqual(parsePace('430'), { ok: true, value: 270 });
});

test('parsePace reads up to 99:59', () => {
  assert.deepEqual(parsePace('9959'), { ok: true, value: 5999 });
});

test('parsePace rejects 60 seconds or more', () => {
  assert.deepEqual(parsePace('575'), { ok: false, error: 'out-of-range' });
});

test('parsePace rejects a pace of zero', () => {
  assert.deepEqual(parsePace('0000'), { ok: false, error: 'out-of-range' });
});

test('parsePace of no digits is empty', () => {
  assert.deepEqual(parsePace(''), { ok: false, error: 'empty' });
});

test('formatDuration rounds to the second', () => {
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(3000), '50:00');
  assert.equal(formatDuration(5696.19), '1:34:56');
  assert.equal(formatDuration(3723), '1:02:03');
  assert.equal(formatDuration(3599.6), '1:00:00');
  assert.equal(formatDuration(26.19), '0:26');
});

test('formatKm gives whole km, or the exact distance for a partial km', () => {
  assert.equal(formatKm(1000 as Meters, 'en'), '1');
  assert.equal(formatKm(21000 as Meters, 'en'), '21');
  assert.equal(formatKm(21097.5 as Meters, 'en'), '21.0975');
  assert.equal(formatKm(42195 as Meters, 'en'), '42.195');
});

test('formatKm uses the decimal separator of the locale', () => {
  assert.equal(formatKm(1000 as Meters, 'es'), '1');
  assert.equal(formatKm(21097.5 as Meters, 'es'), '21,0975');
  assert.equal(formatKm(42195 as Meters, 'es'), '42,195');
});
