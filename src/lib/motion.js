// Svelte's transitions run on the Web Animations API, which the
// `prefers-reduced-motion` rule in app.css can't reach. Components import them
// from here instead: identical, but instant when the visitor asks for less motion.
import { fade as _fade, fly as _fly, scale as _scale, slide as _slide } from 'svelte/transition';
import { flip as _flip } from 'svelte/animate';
import { prefersReducedMotion } from './ui.svelte.js';

const calm =
  (fn) =>
  (...args) =>
    prefersReducedMotion() ? { duration: 0 } : fn(...args);

export const fade = calm(_fade);
export const fly = calm(_fly);
export const scale = calm(_scale);
export const slide = calm(_slide);
export const flip = calm(_flip);
