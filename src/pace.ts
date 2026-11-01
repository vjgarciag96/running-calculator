// Brands exist only at compile time. Meters come only from DISTANCES, and times and
// paces are meant to come only from checked user input, so calculate() never sees a bad
// distance or goal.
declare const brand: unique symbol;
/** Finite metres, > 0. */
export type Meters = number & { readonly [brand]: 'Meters' };
/** Finite seconds, > 0. */
export type Seconds = number & { readonly [brand]: 'Seconds' };
/** Finite seconds per km, > 0. A pace, so it can't stand in for a finish time. */
export type SecondsPerKm = number & { readonly [brand]: 'SecondsPerKm' };

export type Goal =
  | { kind: 'time'; seconds: Seconds }
  | { kind: 'pace'; secondsPerKm: SecondsPerKm };

export interface Split {
  meters: Meters;
  seconds: Seconds;
  cumulativeMeters: Meters;
  cumulativeSeconds: Seconds;
}

export interface Calculation {
  meters: Meters;
  secondsPerKm: SecondsPerKm;
  finishSeconds: Seconds;
  splits: readonly Split[];
}

export const DISTANCES = {
  '5k': { meters: 5000 as Meters },
  '10k': { meters: 10000 as Meters },
  half: { meters: 21097.5 as Meters },
  marathon: { meters: 42195 as Meters },
} as const;
export type PresetId = keyof typeof DISTANCES;

/**
 * Pace from a finish time, or finish time from a pace, plus even 1 km splits with a final
 * partial split.
 */
export function calculate(meters: Meters, goal: Goal): Calculation {
  const secondsPerKm = goal.kind === 'pace' ? goal.secondsPerKm : paceFor(goal.seconds, meters);
  const finishSeconds = goal.kind === 'time' ? goal.seconds : timeFor(secondsPerKm, meters);

  const splits: Split[] = [];
  for (let done = 0; done < meters;) {
    const length = Math.min(1000, meters - done) as Meters;
    done += length;
    const cumulativeMeters = done as Meters;
    splits.push({
      meters: length,
      seconds: timeFor(secondsPerKm, length),
      cumulativeMeters,
      cumulativeSeconds: timeFor(secondsPerKm, cumulativeMeters),
    });
  }
  return { meters, secondsPerKm, finishSeconds, splits };
}

function paceFor(seconds: Seconds, meters: Meters): SecondsPerKm {
  return ((seconds / meters) * 1000) as SecondsPerKm;
}

function timeFor(secondsPerKm: SecondsPerKm, meters: Meters): Seconds {
  return ((meters / 1000) * secondsPerKm) as Seconds;
}
