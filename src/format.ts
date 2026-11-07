import type { Goal, Meters, Seconds, SecondsPerKm } from './pace.ts';
import type { Locale } from './strings.ts';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'out-of-range';

/** How many digits the goal box holds: hh mm ss for a finish time, mm ss for a pace. */
export const MAX_DIGITS: Record<Goal['kind'], number> = { time: 6, pace: 4 };

/** What the goal field may hold: only digits, the first ones that fit. '4:30' → '430'. */
export function keepDigits(text: string, kind: Goal['kind']): string {
  return text.replace(/\D/g, '').slice(0, MAX_DIGITS[kind]);
}

/**
 * Digits filled from the right, since phone number pads have no ':', and split into the box's
 * pairs: '4500' → ['00', '45', '00'] for a finish time, '430' → ['04', '30'] for a pace.
 */
export function toPairs(digits: string, kind: Goal['kind']): string[] {
  return digits.slice(0, MAX_DIGITS[kind]).padStart(MAX_DIGITS[kind], '0').match(/../g)!;
}

/** Digits as hh:mm:ss → seconds (> 0): '13456' is 1:34:56. */
export function parseDuration(digits: string): Result<Seconds, ParseError> {
  const [hours, minutes, seconds] = toPairs(digits, 'time').map(Number);
  const total = hours * 3600 + minutes * 60 + seconds;
  return check<Seconds>(digits, total, minutes < 60 && seconds < 60);
}

/** Digits as mm:ss → seconds per km (> 0): '430' is 4:30. */
export function parsePace(digits: string): Result<SecondsPerKm, ParseError> {
  const [minutes, seconds] = toPairs(digits, 'pace').map(Number);
  return check<SecondsPerKm>(digits, minutes * 60 + seconds, seconds < 60);
}

function check<T extends number>(
  digits: string,
  total: number,
  inRange: boolean,
): Result<T, ParseError> {
  if (digits === '') {
    return { ok: false, error: 'empty' };
  }
  return inRange && total > 0
    ? { ok: true, value: total as T }
    : { ok: false, error: 'out-of-range' };
}

/** Rounds to the nearest second first. < 1 h → 'm:ss', otherwise 'h:mm:ss'. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Kilometres for a splits table, exact: 1000 → '1', 21097.5 → '21.0975' ('21,0975' in Spanish). */
export function formatKm(meters: Meters, locale: Locale): string {
  // Four decimals is 0.1 m, so every preset distance shows exactly instead of looking rounded off.
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(meters / 1000);
}
