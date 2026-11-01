import { parseDuration, type ParseError, type Result } from './format.ts';
import type { Goal, PresetId } from './pace.ts';

/** Everything the page holds. The goal text is read as a finish time. */
export interface Inputs {
  preset: PresetId;
  text: string;
}

export const DEFAULT_INPUTS: Inputs = { preset: '10k', text: '5000' };

export function toGoal(inputs: Inputs): Result<Goal, ParseError> {
  const seconds = parseDuration(inputs.text);
  return seconds.ok ? { ok: true, value: { kind: 'time', seconds: seconds.value } } : seconds;
}
