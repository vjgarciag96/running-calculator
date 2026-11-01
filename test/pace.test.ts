import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculate, DISTANCES, type Seconds, type SecondsPerKm } from '../src/pace.ts';

test('10 km in 50:00 holds 5:00/km with ten 5:00 splits', () => {
  const c = calculate(DISTANCES['10k'].meters, { kind: 'time', seconds: 3000 as Seconds });
  assert.equal(c.secondsPerKm, 300);
  assert.equal(c.finishSeconds, 3000);
  assert.equal(c.splits.length, 10);
  assert.ok(c.splits.every((s) => s.meters === 1000 && s.seconds === 300));
  assert.equal(c.splits.at(-1)!.cumulativeMeters, 10000);
  assert.equal(c.splits.at(-1)!.cumulativeSeconds, 3000);
});

test('half marathon at 4:30/km finishes in 1:34:56 with a 97.5 m last split', () => {
  const c = calculate(DISTANCES.half.meters, { kind: 'pace', secondsPerKm: 270 as SecondsPerKm });
  assert.equal(c.finishSeconds, 5696.325);
  assert.equal(c.splits.length, 22);
  const last = c.splits.at(-1)!;
  assert.equal(last.meters, 97.5);
  assert.equal(last.seconds, 26.325);
  assert.equal(last.cumulativeMeters, 21097.5);
  assert.equal(last.cumulativeSeconds, c.finishSeconds);
});

test('time to pace round trip gives back the same pace', () => {
  const byPace = calculate(DISTANCES.half.meters, {
    kind: 'pace',
    secondsPerKm: 270 as SecondsPerKm,
  });
  const byTime = calculate(DISTANCES.half.meters, {
    kind: 'time',
    seconds: byPace.finishSeconds,
  });
  assert.equal(byTime.secondsPerKm, 270);
});
