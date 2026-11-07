import { formatDuration, formatKm, keepDigits, MAX_DIGITS, toPairs } from './format.ts';
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
const pairs = document.querySelectorAll('.pair > :first-child');
const spoken = document.getElementById('spoken')!;
const hint = document.getElementById('hint')!;
const message = document.getElementById('message')!;
const pace = document.getElementById('pace') as HTMLOutputElement;
const finish = document.getElementById('finish') as HTMLOutputElement;
const splits = document.querySelector('tbody')!;

let inputs = DEFAULT_INPUTS;
fill(inputs);
render(inputs);

// Switching mode keeps the digits as typed and reads them the other way, so a goal typed before
// noticing the mode was wrong is still there after switching. The field gets the kept digits
// back, so Backspace never removes one the box doesn't show.
form.addEventListener('input', () => {
  inputs = readForm();
  if (field.value !== inputs.digits) {
    field.value = inputs.digits;
  }
  render(inputs);
});
// Results are live, so Enter has nothing to submit and would only reload the page.
form.addEventListener('submit', (event) => event.preventDefault());

function readForm(): Inputs {
  const mode = modes.value as Goal['kind'];
  return {
    preset: presets.value as PresetId,
    mode,
    digits: keepDigits(field.value, mode),
  };
}

function fill(inputs: Inputs): void {
  presets.value = inputs.preset;
  modes.value = inputs.mode;
  field.value = inputs.digits;
}

function render(inputs: Inputs): void {
  label.textContent = t[`${inputs.mode}Field`];
  hint.textContent = t[`${inputs.mode}Hint`];
  renderBox(inputs);

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

// Pace mode hides the hh pair, so its digits go in the last two pairs.
function renderBox({ mode, digits }: Inputs): void {
  const shown = toPairs(digits, mode);
  const untyped = MAX_DIGITS[mode] - digits.length;
  shown.forEach((pair, i) => {
    const [zeros, typed] = pairs[pairs.length - shown.length + i].children;
    const cut = Math.min(2, Math.max(0, untyped - 2 * i));
    zeros.textContent = pair.slice(0, cut);
    typed.textContent = pair.slice(cut);
  });
  // Read as '45:00' rather than '4500', without the hours when there are none.
  spoken.textContent = digits && shown.join(':').replace(/^00:(?=\d\d:)/, '');
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
