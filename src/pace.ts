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

export const DISTANCES = {
  '5k': { label: '5K', meters: 5000 },
  '10k': { label: '10K', meters: 10000 },
  half: { label: 'Half', meters: 21097 },
  marathon: { label: 'Marathon', meters: 42195 },
} as const;
export type PresetId = keyof typeof DISTANCES;

/** Derives the missing side of the goal plus even 1 km splits with a final partial split. */
export function calculate(meters: number, goal: Goal): Result<Calculation, InputError> {
  if (!isPositiveFinite(meters)) return { ok: false, error: 'bad-distance' };
  const given = goal.kind === 'time' ? goal.seconds : goal.secondsPerKm;
  if (!isPositiveFinite(given)) return { ok: false, error: 'bad-goal' };

  const km = meters / 1000;
  const secondsPerKm = goal.kind === 'pace' ? goal.secondsPerKm : goal.seconds / km;
  const finishSeconds = goal.kind === 'time' ? goal.seconds : goal.secondsPerKm * km;

  const splits: Split[] = [];
  for (let done = 0; done < meters; ) {
    const length = Math.min(1000, meters - done);
    done += length;
    splits.push({
      meters: length,
      seconds: (length / 1000) * secondsPerKm,
      cumulativeMeters: done,
      cumulativeSeconds: (done / 1000) * secondsPerKm,
    });
  }
  return { ok: true, value: { meters, secondsPerKm, finishSeconds, splits } };
}

/** 'm:ss' or 'h:mm:ss' → seconds (> 0). Trims whitespace. */
export function parseDuration(text: string): Result<number, ParseError> {
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
  return { ok: true, value: seconds };
}

/** Decimal km ('21.1', also '21,1') → whole metres (> 0). */
export function parseKm(text: string): Result<number, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };
  if (!/^-?(\d+([.,]\d*)?|[.,]\d+)$/.test(trimmed)) return { ok: false, error: 'malformed' };
  const meters = Math.round(Number(trimmed.replace(',', '.')) * 1000);
  if (!isPositiveFinite(meters)) return { ok: false, error: 'out-of-range' };
  return { ok: true, value: meters };
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
