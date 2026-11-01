// Every user-visible string, by locale. `en` defines the keys, so tsc rejects a locale that
// misses one. page.html refers to keys with data-t, and the build fills them in per locale.
const en = {
  title: 'Running calculator',
  description: 'Pace and finish time for a 5K, 10K, half marathon or marathon.',
  distance: 'Distance',
  '5k': '5K',
  '10k': '10K',
  half: 'Half',
  marathon: 'Marathon',
  goal: 'Goal',
  perKm: '/km',
  timeField: 'Finish time',
  timeHint: 'Digits fill from the right: 13456 is 1:34:56.',
  malformed: 'Type digits, like 430, or a time like 4:30.',
  'out-of-range': 'Minutes and seconds go up to 59, and the time must be above 0.',
  paceResult: 'Pace',
  finishResult: 'Finish',
};

export type Messages = Record<keyof typeof en, string>;

const es: Messages = {
  title: 'Calculadora de ritmo',
  description: 'Ritmo y tiempo final para 5K, 10K, media maratón o maratón.',
  distance: 'Distancia',
  '5k': '5K',
  '10k': '10K',
  half: 'Media maratón',
  marathon: 'Maratón',
  goal: 'Objetivo',
  perKm: '/km',
  timeField: 'Tiempo final',
  timeHint: 'Los dígitos se rellenan desde la derecha: 13456 es 1:34:56.',
  malformed: 'Escribe dígitos, como 430, o un tiempo como 4:30.',
  'out-of-range':
    'Los minutos y los segundos llegan hasta 59, y el tiempo tiene que ser mayor que 0.',
  paceResult: 'Ritmo',
  finishResult: 'Tiempo final',
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
