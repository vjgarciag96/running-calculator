import {
  formatDuration,
  formatKm,
  keepDigits,
  MAX_DIGITS,
  parseDuration,
  parsePace,
} from './format.ts';
import { DEFAULT_INPUTS, edit, type Inputs, solve } from './inputs.ts';
import type { Goal, PresetId, Split } from './pace.ts';
import { type Locale, STRINGS } from './strings.ts';

// The build writes one page per language, with its text already in place.
const locale = document.documentElement.lang as Locale;
const t = STRINGS[locale];

const form = document.querySelector('form')!;
const presets = form.elements.namedItem('preset') as RadioNodeList;
const message = document.getElementById('message')!;
const splits = document.querySelector('tbody')!;

interface Box {
  kind: Goal['kind'];
  field: HTMLInputElement;
  clock: Element;
  pairs: NodeListOf<Element>;
  tag: HTMLElement;
  value: HTMLElement;
  wrapper: Element;
}

const BOXES: Record<Goal['kind'], Box> = { time: box('time'), pace: box('pace') };

let inputs = DEFAULT_INPUTS;
// The box being composed in and its value when the composition started, kept until it ends.
let composition: { box: Box; before: string } | undefined;
presets.value = inputs.preset;
render(inputs);

for (const radio of presets) {
  radio.addEventListener('input', changeDistance);
}
// Results are live, so Enter has nothing to submit and would only reload the page.
form.addEventListener('submit', (event) => event.preventDefault());
for (const box of Object.values(BOXES)) {
  const { field } = box;
  field.addEventListener('input', () => editBox(box));
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
  // Composed text (an input method, or a phone keyboard's suggestions) can't be cancelled like a
  // key, so over a highlighted value it replaces it even when it has no digits.
  field.addEventListener('compositionstart', () => {
    composition = { box, before: field.value };
  });
  field.addEventListener('compositionend', () => {
    if (!/\d/.test(field.value)) {
      field.value = composition!.before;
    }
    composition = undefined;
    editBox(box);
  });
}
document.addEventListener('selectionchange', syncSelection);

// Each input's id is its kind, and the elements that describe it are named after it.
function box(kind: Goal['kind']): Box {
  const field = document.getElementById(kind) as HTMLInputElement;
  const clock = field.parentElement!;
  return {
    kind,
    field,
    clock,
    pairs: clock.querySelectorAll('.pair > :first-child'),
    tag: document.getElementById(`${kind}-tag`)!,
    value: document.getElementById(`${kind}-value`)!,
    wrapper: clock.parentElement!,
  };
}

function changeDistance(): void {
  inputs = { ...inputs, preset: presets.value as PresetId };
  refresh();
}

function editBox(box: Box): void {
  // A composition in the Calculated box waits for its end, since one with no digits mustn't make
  // that box the goal on the way.
  const waitsForCommit = composition?.box === box && box.kind !== inputs.goal;
  if (!waitsForCommit) {
    inputs = edit(inputs, box.kind, keepDigits(box.field.value, box.kind));
  }
  refresh();
}

function refresh(): void {
  render(inputs);
  syncSelection();
}

// Digits fill from the right, so the only caret that means anything is the one after them.
function syncSelection(): void {
  // A composition keeps its text selected until it ends; moving that selection makes the browser
  // add each update again instead of replacing it.
  if (composition) {
    return;
  }
  for (const { field, clock } of Object.values(BOXES)) {
    const end = field.value.length;
    const selected = end > 0 && field.selectionStart === 0 && field.selectionEnd === end;
    if (document.activeElement === field && !selected && field.selectionStart !== end) {
      field.setSelectionRange(end, end);
    }
    clock.classList.toggle('selected', selected);
  }
}

function render(inputs: Inputs): void {
  const { digits, result } = solve(inputs);
  for (const box of Object.values(BOXES)) {
    const { kind, field } = box;
    const isGoal = kind === inputs.goal;
    let shown = digits[kind];
    if (composition?.box === box) {
      // Rewriting the field ends a composition without a compositionend, so it waits for that,
      // and the box shows the digits being composed.
      shown = keepDigits(field.value, kind) || shown;
    } else {
      field.value = shown;
    }
    renderBox(box, shown);
    const seconds = (kind === 'time' ? parseDuration : parsePace)(shown);
    box.value.textContent = seconds.ok
      ? formatDuration(seconds.value) + (kind === 'pace' ? ` ${t.perKm}` : '')
      : '';
    box.tag.textContent = isGoal ? t.yourGoal : t.calculated;
    box.wrapper.classList.toggle('goal', isGoal);
    field.setAttribute(
      'aria-describedby',
      `${kind}-value ${kind}-tag help${isGoal ? ' message' : ''}`,
    );
    if (isGoal) {
      field.setAttribute('aria-invalid', String(!result.ok && result.error !== 'empty'));
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  if (!result.ok) {
    message.textContent = result.error === 'empty' ? '' : t[result.error];
    splits.replaceChildren();
    return;
  }
  message.textContent = '';
  splits.replaceChildren(...result.value.splits.map(row));
}

function renderBox({ kind, pairs }: Box, digits: string): void {
  // Two strings lined up with the box's places: the zeros the user hasn't typed, and the digits
  // they have.
  const places = MAX_DIGITS[kind];
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
