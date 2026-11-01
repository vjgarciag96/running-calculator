import type { Seconds, SecondsPerKm } from './pace.ts';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'malformed' | 'out-of-range';

/**
 * 'mm:ss' or 'hh:mm:ss' → seconds (> 0). The first number takes any number of digits, the rest
 * exactly two: '4:30', '50:00', '1:34:56'. Trims whitespace.
 */
export function parseDuration(text: string): Result<Seconds, ParseError> {
  return parseClock(text) as Result<Seconds, ParseError>;
}

/** A pace per km as 'mm:ss', with the same rules as parseDuration: '4:30', '12:30'. */
export function parsePace(text: string): Result<SecondsPerKm, ParseError> {
  return parseClock(text) as Result<SecondsPerKm, ParseError>;
}

function parseClock(text: string): Result<number, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }
  // Two digits after each colon, so a half-typed '4:3' doesn't read as 4:03.
  if (!/^\d+(:\d{2}){1,2}$/.test(trimmed)) {
    return { ok: false, error: 'malformed' };
  }
  const parts = trimmed.split(':').map(Number);
  const hasHours = parts.length === 3;
  const [hours, minutes, seconds] = hasHours ? parts : [0, ...parts];
  // Only the first number is unbounded: '90:00' is fine, '1:90:00' is not.
  if (seconds >= 60 || (hasHours && minutes >= 60)) {
    return { ok: false, error: 'out-of-range' };
  }
  const total = hours * 3600 + minutes * 60 + seconds;
  if (!isPositiveFinite(total)) {
    return { ok: false, error: 'out-of-range' };
  }
  return { ok: true, value: total };
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
