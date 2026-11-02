import { parseDuration, type ParseError, parsePace, type Result } from './format.ts';
import type { Goal, PresetId } from './pace.ts';

/** Everything the page holds. The goal text is read as a time or a pace depending on mode. */
export interface Inputs {
  preset: PresetId;
  mode: Goal['kind'];
  text: string;
}

export const DEFAULT_INPUTS: Inputs = { preset: '10k', mode: 'time', text: '5000' };

export function toGoal(inputs: Inputs): Result<Goal, ParseError> {
  switch (inputs.mode) {
    case 'time': {
      const seconds = parseDuration(inputs.text);
      return seconds.ok ? { ok: true, value: { kind: 'time', seconds: seconds.value } } : seconds;
    }
    case 'pace': {
      const secondsPerKm = parsePace(inputs.text);
      return secondsPerKm.ok
        ? { ok: true, value: { kind: 'pace', secondsPerKm: secondsPerKm.value } }
        : secondsPerKm;
    }
  }
}
