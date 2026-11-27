// Every user-visible string, by locale. `en` defines the keys, so tsc rejects a locale that
// misses one. page.html refers to keys with data-t, and the build fills them in per locale.
const en = {
  title: 'Running calculator',
  heading: 'Running calculator: pace, finish time and 1 km splits',
  description: 'Pace, finish time and 1 km splits for a 5K, 10K, half marathon or marathon.',
  calculator: 'Calculator',
  distance: 'Distance',
  '5k': '5K',
  '10k': '10K',
  half: 'Half',
  marathon: 'Marathon',
  perKm: '/km',
  timeField: 'Finish time',
  paceField: 'Pace per km',
  yourGoal: 'Your goal',
  calculated: 'Calculated',
  'out-of-range': 'Minutes and seconds go up to 59, and the time must be above 0.',
  records: 'World records',
  men: 'Men',
  women: 'Women',
  splits: 'Splits',
  evenPace: 'Even pace',
  km: 'km',
  split: 'Split',
  total: 'Total',
};

export type Messages = Record<keyof typeof en, string>;

const es: Messages = {
  title: 'Calculadora de ritmo',
  heading: 'Calculadora de ritmo: tiempo final y parciales de 1 km',
  description: 'Ritmo, tiempo final y parciales de 1 km para 5K, 10K, media maratón o maratón.',
  calculator: 'Calculadora',
  distance: 'Distancia',
  '5k': '5K',
  '10k': '10K',
  half: 'Media maratón',
  marathon: 'Maratón',
  perKm: '/km',
  timeField: 'Tiempo final',
  paceField: 'Ritmo por km',
  yourGoal: 'Tu objetivo',
  calculated: 'Calculado',
  'out-of-range':
    'Los minutos y los segundos llegan hasta 59, y el tiempo tiene que ser mayor que 0.',
  records: 'Récords mundiales',
  men: 'Hombres',
  women: 'Mujeres',
  splits: 'Parciales',
  evenPace: 'Ritmo constante',
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
