import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_INPUTS, type Inputs, restore, toGoal } from '../src/inputs.ts';

test('restore gives back saved inputs', () => {
  const saved: Inputs = { preset: 'half', mode: 'pace', text: '430' };
  assert.deepEqual(restore(JSON.stringify(saved)), saved);
});

test('restore falls back to the defaults for missing or broken saves', () => {
  for (const saved of [null, '', '{', '[]', 'null', '42', '"10k"']) {
    assert.deepEqual(restore(saved), DEFAULT_INPUTS, String(saved));
  }
});

test('restore replaces only the fields that are unknown', () => {
  assert.deepEqual(
    restore('{"preset":"ultra","mode":"pace","text":"430"}'),
    { ...DEFAULT_INPUTS, mode: 'pace', text: '430' },
  );
  assert.deepEqual(
    restore('{"preset":"toString","mode":"speed","text":430}'),
    DEFAULT_INPUTS,
  );
  assert.deepEqual(
    restore('{"preset":"5k"}'),
    { ...DEFAULT_INPUTS, preset: '5k' },
  );
});

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
