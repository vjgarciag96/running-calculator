import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDuration,
  parsePace,
  parseKm,
  formatDuration,
  calculate,
  DISTANCES,
  type Seconds,
  type SecondsPerKm,
} from '../src/pace.ts';

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

test('10 km in 50:00 holds 5:00/km with ten 5:00 splits', () => {
  const c = calculate(DISTANCES['10k'].meters, { kind: 'time', seconds: 3000 as Seconds });
  assert.equal(formatDuration(c.secondsPerKm), '5:00');
  assert.equal(c.splits.length, 10);
  assert.ok(c.splits.every((s) => s.meters === 1000 && formatDuration(s.seconds) === '5:00'));
  assert.equal(c.splits.at(-1)!.cumulativeMeters, 10000);
  assert.equal(formatDuration(c.splits.at(-1)!.cumulativeSeconds), '50:00');
});

test('half marathon at 4:30/km finishes in 1:34:56 with a 97 m last split', () => {
  const c = calculate(DISTANCES.half.meters, { kind: 'pace', secondsPerKm: 270 as SecondsPerKm });
  assert.equal(formatDuration(c.finishSeconds), '1:34:56');
  assert.equal(c.splits.length, 22);
  const last = c.splits.at(-1)!;
  assert.equal(last.meters, 97);
  assert.equal(formatDuration(last.seconds), '0:26');
  assert.equal(last.cumulativeMeters, 21097);
  assert.equal(formatDuration(last.cumulativeSeconds), '1:34:56');
});

test('time to pace round trip gives back the same pace', () => {
  const byPace = calculate(DISTANCES.half.meters, { kind: 'pace', secondsPerKm: 270 as SecondsPerKm });
  const finish = parseDuration(formatDuration(byPace.finishSeconds));
  assert.ok(finish.ok);
  const byTime = calculate(DISTANCES.half.meters, { kind: 'time', seconds: finish.value });
  assert.equal(formatDuration(byTime.secondsPerKm), '4:30');
});
