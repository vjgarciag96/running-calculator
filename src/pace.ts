export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'malformed' | 'out-of-range';

// Brands exist only at compile time. The parsers are the only way to get one
// from user input, so calculate() never sees a bad distance or goal.
declare const brand: unique symbol;
/** Whole metres, > 0. */
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
  half: { meters: 21097 as Meters },
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

/** 'm:ss' or 'h:mm:ss' → seconds (> 0). Trims whitespace. */
export function parseDuration(text: string): Result<Seconds, ParseError> {
  return parseClock(text) as Result<Seconds, ParseError>;
}

/** A pace typed as 'm:ss' (per km), with the same rules as parseDuration. */
export function parsePace(text: string): Result<SecondsPerKm, ParseError> {
  return parseClock(text) as Result<SecondsPerKm, ParseError>;
}

function parseClock(text: string): Result<number, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return { ok: false, error: 'malformed' };
  }
  const [first, ...rest] = parts.map(Number);
  if (rest.some((n) => n >= 60)) {
    return { ok: false, error: 'out-of-range' };
  }
  const seconds = rest.reduce((total, n) => total * 60 + n, first);
  if (!isPositiveFinite(seconds)) {
    return { ok: false, error: 'out-of-range' };
  }
  return { ok: true, value: seconds };
}

/** Decimal km ('21.1', also '21,1') → whole metres (> 0). */
export function parseKm(text: string): Result<Meters, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }
  if (!/^-?(\d+([.,]\d*)?|[.,]\d+)$/.test(trimmed)) {
    return { ok: false, error: 'malformed' };
  }
  const meters = Math.round(Number(trimmed.replace(',', '.')) * 1000);
  if (!isPositiveFinite(meters)) {
    return { ok: false, error: 'out-of-range' };
  }
  return { ok: true, value: meters as Meters };
}

/** Rounds to the nearest second first. < 1 h → 'm:ss', otherwise 'h:mm:ss'. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function isPositiveFinite(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}
