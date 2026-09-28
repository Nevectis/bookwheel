// Per-device preferences (language, theme, sound). Storage can be missing or
// throw in private windows, so every access is guarded.
const PREFIX = 'bookwheel:';

export const prefs = {
  get(key, fallback = null) {
    try {
      const v = globalThis.localStorage?.getItem(PREFIX + key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      globalThis.localStorage?.setItem(PREFIX + key, String(value));
    } catch {
      /* storage unavailable */
    }
  },
};
