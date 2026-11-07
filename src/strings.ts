// Every user-visible string, by locale. `en` defines the keys, so tsc rejects a locale that
// misses one. page.html refers to keys with data-t, and the build fills them in per locale.
const en = {
  title: 'Running calculator',
  description: 'Pace, finish time and 1 km splits for a 5K, 10K, half marathon or marathon.',
  distance: 'Distance',
  '5k': '5K',
  '10k': '10K',
  half: 'Half',
  marathon: 'Marathon',
  goal: 'Goal',
  perKm: '/km',
  time: 'Finish time',
  pace: 'Pace',
  timeField: 'Finish time',
  paceField: 'Pace per km',
  timeHint: 'Digits fill from the right: 13456 is 1:34:56.',
  paceHint: 'Digits fill from the right: 430 is 4:30.',
  'out-of-range': 'Minutes and seconds go up to 59, and the time must be above 0.',
  paceResult: 'Pace',
  finishResult: 'Finish',
  splits: 'Splits',
  km: 'km',
  split: 'Split',
  total: 'Total',
};

export type Messages = Record<keyof typeof en, string>;

const es: Messages = {
  title: 'Calculadora de ritmo',
  description: 'Ritmo, tiempo final y parciales de 1 km para 5K, 10K, media maratón o maratón.',
  distance: 'Distancia',
  '5k': '5K',
  '10k': '10K',
  half: 'Media maratón',
  marathon: 'Maratón',
  goal: 'Objetivo',
  perKm: '/km',
  time: 'Tiempo final',
  pace: 'Ritmo',
  timeField: 'Tiempo final',
  paceField: 'Ritmo por km',
  timeHint: 'Los dígitos se rellenan desde la derecha: 13456 es 1:34:56.',
  paceHint: 'Los dígitos se rellenan desde la derecha: 430 es 4:30.',
  'out-of-range':
    'Los minutos y los segundos llegan hasta 59, y el tiempo tiene que ser mayor que 0.',
  paceResult: 'Ritmo',
  finishResult: 'Tiempo final',
  splits: 'Parciales',
  km: 'km',
  split: 'Parcial',
  total: 'Total',
};

export const STRINGS = { en, es } satisfies Record<string, Messages>;
export type Locale = keyof typeof STRINGS;

/** First browser language whose primary subtag we support ('es-MX' → 'es'), else 'en'. */
export function pickLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.split('-')[0].toLowerCase();
    if (Object.hasOwn(STRINGS, primary)) {
      return primary as Locale;
    }
  }
  return 'en';
}
