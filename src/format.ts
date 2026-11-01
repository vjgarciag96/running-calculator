import type { Seconds } from './pace.ts';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ParseError = 'empty' | 'malformed' | 'out-of-range';

/**
 * 'mm:ss' or 'hh:mm:ss' → seconds (> 0). The first number takes any number of digits, the rest
 * exactly two: '4:30', '50:00', '1:34:56'. Bare digits fill from the right, since phone number
 * pads have no ':': '430' is 4:30, '13456' is 1:34:56. Trims whitespace.
 */
export function parseDuration(text: string): Result<Seconds, ParseError> {
  return parseClock(text) as Result<Seconds, ParseError>;
}

function parseClock(text: string): Result<number, ParseError> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }
  const clock = /^\d+$/.test(trimmed) ? toClock(trimmed) : trimmed;
  // Two digits after each colon, so a half-typed '4:3' doesn't read as 4:03.
  if (!/^\d+(:\d{2}){1,2}$/.test(clock)) {
    return { ok: false, error: 'malformed' };
  }
  const parts = clock.split(':').map(Number);
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

/** '45' → '0:45', '430' → '4:30', '13456' → '1:34:56'. */
function toClock(digits: string): string {
  const d = digits.padStart(3, '0');
  return d.length > 4
    ? `${d.slice(0, -4)}:${d.slice(-4, -2)}:${d.slice(-2)}`
    : `${d.slice(0, -2)}:${d.slice(-2)}`;
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
