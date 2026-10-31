export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'malformed' | 'out-of-range';
export type InputError = 'bad-distance' | 'bad-goal';

export type Goal =
  | { kind: 'time'; seconds: number }
  | { kind: 'pace'; secondsPerKm: number };

export interface Split {
  meters: number;
  seconds: number;
  cumulativeMeters: number;
  cumulativeSeconds: number;
}

export interface Calculation {
  meters: number;
  secondsPerKm: number;
  finishSeconds: number;
  splits: readonly Split[];
}
