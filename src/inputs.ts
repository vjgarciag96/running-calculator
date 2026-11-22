import { parseDuration, type ParseError, parsePace, type Result, toDigits } from './format.ts';
import { calculate, type Calculation, DISTANCES, type Goal, type PresetId } from './pace.ts';

/** Everything the page holds. Only the goal box's digits are stored; the other box's are worked out. */
export interface Inputs {
  preset: PresetId;
  /** Which box is "Your goal". */
  goal: Goal['kind'];
  /** The goal box's digits, as typed. */
  digits: string;
}

export const DEFAULT_INPUTS: Inputs = { preset: '10k', goal: 'time', digits: '5000' };

export function toGoal(inputs: Inputs): Result<Goal, ParseError> {
  switch (inputs.goal) {
    case 'time': {
      const seconds = parseDuration(inputs.digits);
      return seconds.ok ? { ok: true, value: { kind: 'time', seconds: seconds.value } } : seconds;
    }
    case 'pace': {
      const secondsPerKm = parsePace(inputs.digits);
      return secondsPerKm.ok
        ? { ok: true, value: { kind: 'pace', secondsPerKm: secondsPerKm.value } }
        : secondsPerKm;
    }
  }
}

export interface Solved {
  /** What each box shows: the goal's digits as typed, the other's worked out ('' = empty state). */
  digits: Record<Goal['kind'], string>;
  /** For the message, aria-invalid and the splits. ok even when the Calculated pace is over range. */
  result: Result<Calculation, ParseError>;
}

/** Both boxes' digits and the calculation behind them, from the goal. */
export function solve(inputs: Inputs): Solved {
  const digits = { time: '', pace: '' };
  digits[inputs.goal] = inputs.digits;
  const goal = toGoal(inputs);
  if (!goal.ok) {
    return { digits, result: goal };
  }
  const c = calculate(DISTANCES[inputs.preset].meters, goal.value);
  if (inputs.goal === 'time') {
    digits.pace = toDigits(c.secondsPerKm, 'pace');
  } else {
    digits.time = toDigits(c.finishSeconds, 'time');
  }
  return { digits, result: { ok: true, value: c } };
}

/**
 * Digits typed in the goal box replace the goal's digits. Digits in the other box make it the goal
 * only when they differ from what it shows, so focusing it or a rejected key changes nothing.
 */
export function edit(inputs: Inputs, kind: Goal['kind'], digits: string): Inputs {
  if (kind === inputs.goal) {
    return { ...inputs, digits };
  }
  return digits === solve(inputs).digits[kind] ? inputs : { ...inputs, goal: kind, digits };
}
