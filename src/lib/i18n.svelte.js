import { de, en } from './strings.js';
import { prefs } from './prefs.js';

const dicts = { de, en };

function detect() {
  const saved = prefs.get('lang');
  if (saved in dicts) return saved;
  const nav = globalThis.navigator?.language ?? '';
  return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export const i18n = $state({ lang: detect() });

export function setLang(lang) {
  if (!(lang in dicts)) return;
  i18n.lang = lang;
  prefs.set('lang', lang);
  if (globalThis.document) document.documentElement.lang = lang;
}

export function translate(lang, key, params) {
  const value = dicts[lang]?.[key] ?? en[key];
  if (value == null) return key;
  if (typeof value === 'function') return value(params ?? {});
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? '').toString());
}

/** Reactive translate: reading `i18n.lang` makes templates re-render on switch. */
export function t(key, params) {
  return translate(i18n.lang, key, params);
}

export function locale() {
  return i18n.lang === 'de' ? 'de-DE' : 'en-GB';
}

/** "Anna, Ben und Clara" */
export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' ' + t('common.and') + ' ' + names.at(-1);
}

export function formatAverage(value) {
  return value == null ? '' : value.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
