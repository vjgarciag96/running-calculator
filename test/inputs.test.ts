import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toGoal } from '../src/inputs.ts';

test('toGoal reads the text as a finish time', () => {
  assert.deepEqual(toGoal({ preset: '10k', text: '5000' }), {
    ok: true,
    value: { kind: 'time', seconds: 3000 },
  });
  assert.deepEqual(toGoal({ preset: '10k', text: '575' }), {
    ok: false,
    error: 'out-of-range',
  });
});
