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
