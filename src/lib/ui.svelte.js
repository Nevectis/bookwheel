// Client-only UI state: open dialogs, toasts, theme and sound preferences.
import { prefs } from './prefs.js';

export const ui = $state({
  /** Spin result popup: { bookId, byName } – byName is set when someone else spun. */
  result: null,
  /** Rating dialog: { bookId, congrats } */
  review: null,
  /** Add/edit book dialog: { mode: 'add' } | { mode: 'edit', bookId } */
  bookForm: null,
  clubOpen: false,
  profileOpen: false,
  /** Generic confirmation: { message, confirmLabel, danger, resolve } */
  confirm: null,
  toasts: [],
  theme: prefs.get('theme', 'system'),
  sound: prefs.get('sound', 'on') !== 'off',
});

export const anyDialogOpen = () =>
  !!(ui.result || ui.review || ui.bookForm || ui.clubOpen || ui.profileOpen || ui.confirm);

let toastId = 0;
export function toast(message, { tone = 'info', action = null, actionLabel = '', duration = 4200 } = {}) {
  const id = ++toastId;
  ui.toasts.push({ id, message, tone, action, actionLabel });
  setTimeout(() => dismissToast(id), action ? Math.max(duration, 6500) : duration);
  return id;
}
export function dismissToast(id) {
  const i = ui.toasts.findIndex((t) => t.id === id);
  if (i >= 0) ui.toasts.splice(i, 1);
}

export function confirmDialog(message, { confirmLabel, danger = false } = {}) {
  return new Promise((resolve) => {
    ui.confirm = { message, confirmLabel, danger, resolve };
  });
}
export function settleConfirm(value) {
  const c = ui.confirm;
  ui.confirm = null;
  c?.resolve(value);
}

/** On load: apply a saved explicit choice; otherwise leave the page's theme alone. */
export function initTheme() {
  const root = globalThis.document?.documentElement;
  if (root && (ui.theme === 'light' || ui.theme === 'dark')) root.setAttribute('data-theme', ui.theme);
}

/** From the menu: the user picked Auto, Light or Dark. */
export function applyTheme(theme) {
  ui.theme = theme;
  prefs.set('theme', theme);
  const root = globalThis.document?.documentElement;
  if (!root) return;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function setSound(on) {
  ui.sound = on;
  prefs.set('sound', on ? 'on' : 'off');
}

export const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
