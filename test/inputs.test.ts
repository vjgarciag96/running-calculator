import assert from 'node:assert/strict';
import { test } from 'node:test';
import { edit, solve, toGoal } from '../src/inputs.ts';

test('toGoal reads the digits as a finish time when the time box is the goal', () => {
  assert.deepEqual(toGoal({ preset: '10k', goal: 'time', digits: '5000' }), {
    ok: true,
    value: { kind: 'time', seconds: 3000 },
  });
  assert.deepEqual(toGoal({ preset: '10k', goal: 'time', digits: '575' }), {
    ok: false,
    error: 'out-of-range',
  });
});

test('toGoal reads the digits as a pace when the pace box is the goal', () => {
  assert.deepEqual(toGoal({ preset: '10k', goal: 'pace', digits: '500' }), {
    ok: true,
    value: { kind: 'pace', secondsPerKm: 300 },
  });
  assert.deepEqual(toGoal({ preset: '10k', goal: 'pace', digits: '575' }), {
    ok: false,
    error: 'out-of-range',
  });
});

test('solve gives a 5:00 pace for a 50:00 10K', () => {
  const { digits } = solve({ preset: '10k', goal: 'time', digits: '5000' });

  assert.deepEqual(digits, { time: '5000', pace: '500' });
});

test('solve gives a 45:00 finish for a 4:30 pace on a 10K', () => {
  const { digits } = solve({ preset: '10k', goal: 'pace', digits: '430' });

  assert.deepEqual(digits, { time: '4500', pace: '430' });
});

test('solve gives a 1:34:56 finish for a 4:30 pace on the half', () => {
  const { digits } = solve({ preset: 'half', goal: 'pace', digits: '430' });

  assert.equal(digits.time, '13456');
});

test('solve keeps a pace goal digits as typed on another distance', () => {
  const { digits } = solve({ preset: 'half', goal: 'pace', digits: '0430' });

  assert.equal(digits.pace, '0430');
});

test('solve keeps a finish time goal digits as typed on another distance', () => {
  const { digits } = solve({ preset: 'marathon', goal: 'time', digits: '05000' });

  assert.equal(digits.time, '05000');
});

test('solve gives an empty Calculated box for an invalid goal', () => {
  const solved = solve({ preset: '10k', goal: 'time', digits: '575' });

  assert.deepEqual(solved, {
    digits: { time: '575', pace: '' },
    result: { ok: false, error: 'out-of-range' },
  });
});

test('solve gives an empty Calculated box for an empty goal', () => {
  const solved = solve({ preset: '10k', goal: 'pace', digits: '' });

  assert.deepEqual(solved, {
    digits: { time: '', pace: '' },
    result: { ok: false, error: 'empty' },
  });
});

test('solve gives an empty pace box, with the splits, for a pace over 99:59', () => {
  const { digits, result } = solve({ preset: '5k', goal: 'time', digits: '81958' });

  assert.equal(digits.pace, '');
  assert.equal(result.ok, true, 'no calculation for the splits');
});

test('solve gives 99:59 for a 5K in 8:19:57', () => {
  const { digits } = solve({ preset: '5k', goal: 'time', digits: '81957' });

  assert.equal(digits.pace, '9959');
});

test('edit in the goal box replaces the goal digits', () => {
  const inputs = edit({ preset: '10k', goal: 'time', digits: '5000' }, 'time', '50001');

  assert.deepEqual(inputs, { preset: '10k', goal: 'time', digits: '50001' });
});

test('edit in the Calculated box with new digits makes it the goal', () => {
  const inputs = edit({ preset: '10k', goal: 'time', digits: '5000' }, 'pace', '4');

  assert.deepEqual(inputs, { preset: '10k', goal: 'pace', digits: '4' });
});

test('edit in the Calculated box with the digits it shows changes nothing', () => {
  const before = { preset: '10k', goal: 'time', digits: '5000' } as const;

  const inputs = edit(before, 'pace', '500');

  assert.equal(inputs, before);
});

test('edit emptying the Calculated box makes it the goal with no digits', () => {
  const inputs = edit({ preset: '10k', goal: 'time', digits: '5000' }, 'pace', '');

  assert.deepEqual(inputs, { preset: '10k', goal: 'pace', digits: '' });
});
