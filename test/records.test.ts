import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../src/format.ts';
import { DISTANCES, paceFor, type PresetId } from '../src/pace.ts';
import { RECORDS } from '../src/records.ts';

// Each record as the page shows it: time, athlete and year, and the pace /km.
function shown(preset: PresetId) {
  const entry = (category: 'men' | 'women') => {
    const { seconds, athlete, year } = RECORDS[preset][category];
    const pace = formatDuration(paceFor(seconds, DISTANCES[preset].meters));
    return { time: formatDuration(seconds), athlete, year, pace };
  };
  return { men: entry('men'), women: entry('women') };
}

test('there are records for every distance and no other', () => {
  assert.deepEqual(Object.keys(RECORDS), ['5k', '10k', 'half', 'marathon']);
});

test('the 5K records are Aregawi in 12:49 and Chebet in 13:54', () => {
  assert.deepEqual(shown('5k'), {
    men: { time: '12:49', athlete: 'Berihu Aregawi', year: 2021, pace: '2:34' },
    women: { time: '13:54', athlete: 'Beatrice Chebet', year: 2024, pace: '2:47' },
  });
});

test('the 10K records are Kejelcha in 26:31 and Ngetich in 28:46', () => {
  assert.deepEqual(shown('10k'), {
    men: { time: '26:31', athlete: 'Yomif Kejelcha', year: 2025, pace: '2:39' },
    women: { time: '28:46', athlete: 'Agnes Ngetich', year: 2024, pace: '2:53' },
  });
});

test('the half marathon records are Kiplimo in 57:20 and Gidey in 1:02:52', () => {
  assert.deepEqual(shown('half'), {
    men: { time: '57:20', athlete: 'Jacob Kiplimo', year: 2026, pace: '2:43' },
    women: { time: '1:02:52', athlete: 'Letesenbet Gidey', year: 2021, pace: '2:59' },
  });
});

test('the marathon records are Sawe in 1:59:30 and Chepngetich in 2:09:56', () => {
  assert.deepEqual(shown('marathon'), {
    men: { time: '1:59:30', athlete: 'Sabastian Sawe', year: 2026, pace: '2:50' },
    women: { time: '2:09:56', athlete: 'Ruth Chepngetich', year: 2024, pace: '3:05' },
  });
});
