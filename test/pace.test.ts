import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculate, DISTANCES, type Goal, type Seconds, type SecondsPerKm } from '../src/pace.ts';

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
  // Floating point can be off in the last digit (the marathon at 890 s/km comes back as
  // 890.0000000000001), far below the second the UI shows, so compare with a tolerance.
  for (const { meters } of Object.values(DISTANCES)) {
    for (const pace of [270, 890]) {
      const byPace = calculate(meters, { kind: 'pace', secondsPerKm: pace as SecondsPerKm });
      const byTime = calculate(meters, { kind: 'time', seconds: byPace.finishSeconds });
      assert.ok(Math.abs(byTime.secondsPerKm - pace) < 1e-9, `${meters} m at ${pace} s/km`);
    }
  }
});

test('every distance splits cleanly and ends exactly at the finish, in both modes', () => {
  const goals: Goal[] = [
    { kind: 'pace', secondsPerKm: 300 as SecondsPerKm },
    { kind: 'pace', secondsPerKm: 437 as SecondsPerKm },
    { kind: 'time', seconds: 3001 as Seconds },
    { kind: 'time', seconds: 20005 as Seconds },
  ];
  for (const { meters } of Object.values(DISTANCES)) {
    for (const goal of goals) {
      const label = `${meters} m, ${JSON.stringify(goal)}`;
      const c = calculate(meters, goal);
      assert.equal(c.splits.length, Math.ceil(meters / 1000), label);
      assert.equal(c.splits.reduce((sum, s) => sum + s.meters, 0), meters, label);
      c.splits.forEach((s, i) => {
        const previous = c.splits[i - 1];
        assert.ok(!previous || s.cumulativeMeters > previous.cumulativeMeters, label);
        assert.ok(!previous || s.cumulativeSeconds > previous.cumulativeSeconds, label);
      });
      assert.equal(c.splits.at(-1)!.cumulativeMeters, meters, label);
      assert.equal(c.splits.at(-1)!.cumulativeSeconds, c.finishSeconds, label);
    }
  }
});
