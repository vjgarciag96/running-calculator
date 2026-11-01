export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'malformed' | 'out-of-range';

// Brands exist only at compile time. The parsers are the only way to get one
// from user input, so calculate() never sees a bad distance or goal.
declare const brand: unique symbol;
/** Whole metres, > 0. */
export type Meters = number & { readonly [brand]: 'Meters' };
/** Finite seconds, > 0. */
export type Seconds = number & { readonly [brand]: 'Seconds' };

export type Goal =
  | { kind: 'time'; seconds: Seconds }
  | { kind: 'pace'; secondsPerKm: Seconds };

export interface Split {
  meters: Meters;
  seconds: Seconds;
  cumulativeMeters: Meters;
  cumulativeSeconds: Seconds;
}

export interface Calculation {
  meters: Meters;
  secondsPerKm: Seconds;
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

/** Pace from a finish time, or finish time from a pace, plus even 1 km splits with a final partial split. */
export function calculate(meters: Meters, goal: Goal): Calculation {
  const secondsPerKm = goal.kind === 'pace'
    ? goal.secondsPerKm
    : ((goal.seconds / meters) * 1000) as Seconds;
  const secondsFor = (m: number) => ((m / 1000) * secondsPerKm) as Seconds;
  const finishSeconds = goal.kind === 'time' ? goal.seconds : secondsFor(meters);

  const splits: Split[] = [];
  for (let done = 0; done < meters; ) {
    const length = Math.min(1000, meters - done);
    done += length;
    splits.push({
      meters: length as Meters,
      seconds: secondsFor(length),
      cumulativeMeters: done as Meters,
      cumulativeSeconds: secondsFor(done),
    });
  }
  return { meters, secondsPerKm, finishSeconds, splits };
}

/** 'm:ss' or 'h:mm:ss' → seconds (> 0). Trims whitespace. */
export function parseDuration(text: string): Result<Seconds, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return { ok: false, error: 'malformed' };
  }
  const [first, ...rest] = parts.map(Number);
  if (rest.some((n) => n >= 60)) return { ok: false, error: 'out-of-range' };
  const seconds = rest.reduce((total, n) => total * 60 + n, first);
  if (!isPositiveFinite(seconds)) return { ok: false, error: 'out-of-range' };
  return { ok: true, value: seconds as Seconds };
}

/** Decimal km ('21.1', also '21,1') → whole metres (> 0). */
export function parseKm(text: string): Result<Meters, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };
  if (!/^-?(\d+([.,]\d*)?|[.,]\d+)$/.test(trimmed)) return { ok: false, error: 'malformed' };
  const meters = Math.round(Number(trimmed.replace(',', '.')) * 1000);
  if (!isPositiveFinite(meters)) return { ok: false, error: 'out-of-range' };
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
