import { parseDuration, type ParseError, parsePace, type Result } from './format.ts';
import { DISTANCES, type Goal, type PresetId } from './pace.ts';

/** Everything the page holds. The goal text is read as a time or a pace depending on mode. */
export interface Inputs {
  preset: PresetId;
  mode: Goal['kind'];
  text: string;
}

export const DEFAULT_INPUTS: Inputs = { preset: '10k', mode: 'time', text: '5000' };

/** Saved JSON → Inputs. Anything missing, unknown or unparsable falls back to its default. */
export function restore(saved: string | null): Inputs {
  const data = parseObject(saved);
  return {
    preset: typeof data.preset === 'string' && Object.hasOwn(DISTANCES, data.preset)
      ? (data.preset as PresetId)
      : DEFAULT_INPUTS.preset,
    mode: data.mode === 'time' || data.mode === 'pace' ? data.mode : DEFAULT_INPUTS.mode,
    text: typeof data.text === 'string' ? data.text : DEFAULT_INPUTS.text,
  };
}

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

function parseObject(saved: string | null): Record<string, unknown> {
  try {
    const data: unknown = JSON.parse(saved ?? '');
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
