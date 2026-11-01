import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/format.ts';
import { calculate, DISTANCES, type Seconds, type SecondsPerKm } from '../src/pace.ts';

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
  const byPace = calculate(DISTANCES.half.meters, {
    kind: 'pace',
    secondsPerKm: 270 as SecondsPerKm,
  });
  const finish = parseDuration(formatDuration(byPace.finishSeconds));
  assert.ok(finish.ok);
  const byTime = calculate(DISTANCES.half.meters, { kind: 'time', seconds: finish.value });
  assert.equal(formatDuration(byTime.secondsPerKm), '4:30');
});
