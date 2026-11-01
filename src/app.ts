import { formatDuration, formatKm } from './format.ts';
import { DEFAULT_INPUTS, type Inputs, toGoal } from './inputs.ts';
import { calculate, DISTANCES, type Goal, type PresetId, type Split } from './pace.ts';
import { type Locale, STRINGS } from './strings.ts';

// The build writes one page per language, with its text already in place.
const locale = document.documentElement.lang as Locale;
const t = STRINGS[locale];

const form = document.querySelector('form')!;
const presets = form.elements.namedItem('preset') as RadioNodeList;
const modes = form.elements.namedItem('mode') as RadioNodeList;
const field = form.elements.namedItem('goal') as HTMLInputElement;
const label = document.querySelector('label[for=goal]')!;
const hint = document.getElementById('hint')!;
const message = document.getElementById('message')!;
const pace = document.getElementById('pace') as HTMLOutputElement;
const finish = document.getElementById('finish') as HTMLOutputElement;
const splits = document.querySelector('tbody')!;

let inputs = DEFAULT_INPUTS;
fill(inputs);
render(inputs);

// Switching mode keeps the text as typed and reads it the other way, so a goal typed before
// noticing the mode was wrong is still there after switching.
form.addEventListener('input', () => {
  inputs = readForm();
  render(inputs);
});
// Results are live, so Enter has nothing to submit and would only reload the page.
form.addEventListener('submit', (event) => event.preventDefault());

function readForm(): Inputs {
  return {
    preset: presets.value as PresetId,
    mode: modes.value as Goal['kind'],
    text: field.value,
  };
}

function fill(inputs: Inputs): void {
  presets.value = inputs.preset;
  modes.value = inputs.mode;
  field.value = inputs.text;
}

function render(inputs: Inputs): void {
  label.textContent = t[`${inputs.mode}Field`];
  hint.textContent = t[`${inputs.mode}Hint`];

  const goal = toGoal(inputs);
  field.setAttribute('aria-invalid', String(!goal.ok && goal.error !== 'empty'));
  if (!goal.ok) {
    message.textContent = goal.error === 'empty' ? '' : t[goal.error];
    pace.value = finish.value = '–';
    splits.replaceChildren();
    return;
  }
  message.textContent = '';
  const c = calculate(DISTANCES[inputs.preset].meters, goal.value);
  pace.value = `${formatDuration(c.secondsPerKm)} ${t.perKm}`;
  finish.value = formatDuration(c.finishSeconds);
  splits.replaceChildren(...c.splits.map(row));
}

function row(split: Split): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (
    const text of [
      formatKm(split.cumulativeMeters, locale),
      formatDuration(split.seconds),
      formatDuration(split.cumulativeSeconds),
    ]
  ) {
    tr.insertCell().textContent = text;
  }
  return tr;
}
