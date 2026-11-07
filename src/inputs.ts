import { parseDuration, type ParseError, parsePace, type Result } from './format.ts';
import type { Goal, PresetId } from './pace.ts';

/** Everything the page holds. The goal digits are read as a time or a pace depending on mode. */
export interface Inputs {
  preset: PresetId;
  mode: Goal['kind'];
  digits: string;
}

export const DEFAULT_INPUTS: Inputs = { preset: '10k', mode: 'time', digits: '5000' };

export function toGoal(inputs: Inputs): Result<Goal, ParseError> {
  switch (inputs.mode) {
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
