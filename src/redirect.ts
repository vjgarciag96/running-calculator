import { pickLocale } from './strings.ts';

location.replace(`${pickLocale(navigator.languages)}/`);
