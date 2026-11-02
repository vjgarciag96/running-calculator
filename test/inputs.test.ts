import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toGoal } from '../src/inputs.ts';

test('toGoal reads the text as a finish time in time mode', () => {
  assert.deepEqual(toGoal({ preset: '10k', mode: 'time', text: '5000' }), {
    ok: true,
    value: { kind: 'time', seconds: 3000 },
  });
  assert.deepEqual(toGoal({ preset: '10k', mode: 'time', text: '575' }), {
    ok: false,
    error: 'out-of-range',
  });
});

test('toGoal reads the text as a pace in pace mode', () => {
  assert.deepEqual(toGoal({ preset: '10k', mode: 'pace', text: '500' }), {
    ok: true,
    value: { kind: 'pace', secondsPerKm: 300 },
  });
  assert.deepEqual(toGoal({ preset: '10k', mode: 'pace', text: '575' }), {
    ok: false,
    error: 'out-of-range',
  });
});
