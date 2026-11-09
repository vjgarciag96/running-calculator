import { formatDuration, formatKm, keepDigits, MAX_DIGITS } from './format.ts';
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
const clock = document.querySelector('.clock')!;
const label = document.querySelector('label[for=goal]')!;
const pairs = document.querySelectorAll('.pair > :first-child');
const hint = document.getElementById('hint')!;
const message = document.getElementById('message')!;
const pace = document.getElementById('pace') as HTMLOutputElement;
const finish = document.getElementById('finish') as HTMLOutputElement;
const splits = document.querySelector('tbody')!;

let inputs = DEFAULT_INPUTS;
fill(inputs);
render(inputs);

// Switching mode reads the digits the other way, so a goal typed before noticing the mode was
// wrong is still there after switching, except that a pace keeps only the first four. The field
// gets the kept digits back, so Backspace never removes one the box doesn't show.
form.addEventListener('input', () => {
  inputs = readForm();
  if (field.value !== inputs.digits) {
    field.value = inputs.digits;
  }
  render(inputs);
  syncSelection();
});
// Results are live, so Enter has nothing to submit and would only reload the page.
form.addEventListener('submit', (event) => event.preventDefault());
// On click because a tap places its caret after focus, which would undo a selection made then.
field.addEventListener('click', () => {
  field.select();
  // Selecting what is already selected fires no selectionchange.
  syncSelection();
});
// WebKit collapses a selection pressed inside just after the click, undoing the select above.
field.addEventListener('mousedown', (event) => {
  if (document.activeElement === field) {
    event.preventDefault();
  }
});
// Left alone, a letter over a selection would replace the value and then be stripped, losing it.
field.addEventListener('beforeinput', (event) => {
  // selectionchange arrives late, so a quick key could still land where the caret was moved.
  syncSelection();
  if (event.data && !/\d/.test(event.data)) {
    event.preventDefault();
  }
});
document.addEventListener('selectionchange', syncSelection);

// Digits fill from the right, so the only caret that means anything is the one after them.
function syncSelection(): void {
  const end = field.value.length;
  const selected = end > 0 && field.selectionStart === 0 && field.selectionEnd === end;
  if (document.activeElement === field && !selected && field.selectionStart !== end) {
    field.setSelectionRange(end, end);
  }
  clock.classList.toggle('selected', selected);
}

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

function renderBox({ digits }: Inputs): void {
  // Two strings lined up with the box's places: the zeros the user hasn't typed, and the digits
  // they have. In pace mode the hh pair is hidden, so its zeros never show.
  const places = MAX_DIGITS.time;
  const untyped = '0'.repeat(places - digits.length);
  const typedDigits = digits.padStart(places);
  pairs.forEach((pair, i) => {
    const [zeros, typed] = pair.children;
    zeros.textContent = untyped.slice(2 * i, 2 * i + 2);
    typed.textContent = typedDigits.slice(2 * i, 2 * i + 2).trimStart();
  });
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
