import { formatDuration } from './format.ts';
import { DEFAULT_INPUTS, type Inputs, toGoal } from './inputs.ts';
import { calculate, DISTANCES, type PresetId } from './pace.ts';
import { type Locale, STRINGS } from './strings.ts';

// The build writes one page per language, with its text already in place.
const locale = document.documentElement.lang as Locale;
const t = STRINGS[locale];

const form = document.querySelector('form')!;
const presets = form.elements.namedItem('preset') as RadioNodeList;
const field = form.elements.namedItem('goal') as HTMLInputElement;
const message = document.getElementById('message')!;
const pace = document.getElementById('pace') as HTMLOutputElement;
const finish = document.getElementById('finish') as HTMLOutputElement;

let inputs = DEFAULT_INPUTS;
fill(inputs);
render(inputs);

form.addEventListener('input', () => {
  inputs = readForm();
  render(inputs);
});
// Results are live, so Enter has nothing to submit and would only reload the page.
form.addEventListener('submit', (event) => event.preventDefault());

function readForm(): Inputs {
  return {
    preset: presets.value as PresetId,
    text: field.value,
  };
}

function fill(inputs: Inputs): void {
  presets.value = inputs.preset;
  field.value = inputs.text;
}

function render(inputs: Inputs): void {
  const goal = toGoal(inputs);
  field.setAttribute('aria-invalid', String(!goal.ok && goal.error !== 'empty'));
  if (!goal.ok) {
    message.textContent = goal.error === 'empty' ? '' : t[goal.error];
    pace.value = finish.value = '–';
    return;
  }
  message.textContent = '';
  const c = calculate(DISTANCES[inputs.preset].meters, goal.value);
  pace.value = `${formatDuration(c.secondsPerKm)} ${t.perKm}`;
  finish.value = formatDuration(c.finishSeconds);
}
