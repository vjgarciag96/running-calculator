// Ratified outright road world records (women: mixed race), per World Athletics, as of
// 2026-11-24. Pending marks are left out until ratified.
import type { PresetId, Seconds } from './pace.ts';

export interface WorldRecord {
  /** Finish time. */
  seconds: Seconds;
  athlete: string;
  /** Year of the race. */
  year: number;
}

export type Category = 'men' | 'women';

export const RECORDS: Record<PresetId, Record<Category, WorldRecord>> = {
  '5k': {
    men: { seconds: 769 as Seconds, athlete: 'Berihu Aregawi', year: 2021 },
    women: { seconds: 834 as Seconds, athlete: 'Beatrice Chebet', year: 2024 },
  },
  '10k': {
    men: { seconds: 1591 as Seconds, athlete: 'Yomif Kejelcha', year: 2025 },
    women: { seconds: 1726 as Seconds, athlete: 'Agnes Ngetich', year: 2024 },
  },
  half: {
    men: { seconds: 3440 as Seconds, athlete: 'Jacob Kiplimo', year: 2026 },
    women: { seconds: 3772 as Seconds, athlete: 'Letesenbet Gidey', year: 2021 },
  },
  marathon: {
    men: { seconds: 7170 as Seconds, athlete: 'Sabastian Sawe', year: 2026 },
    women: { seconds: 7796 as Seconds, athlete: 'Ruth Chepngetich', year: 2024 },
  },
};
