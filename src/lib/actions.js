// Small Svelte actions for motion and interaction.
import { prefersReducedMotion } from './ui.svelte.js';

/**
 * Slide an element in as it scrolls into view. The element's resting state is
 * fully visible (thumbnails, full-page captures and no-JS all see it); the
 * animation only starts from hidden at the moment it plays.
 */
export function reveal(node, delay = 0) {
  if (prefersReducedMotion() || typeof node.animate !== 'function') return {};
  const play = (wait) =>
    node.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], {
      duration: 800,
      delay: wait,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards',
    });
  // Already on screen at load: part of the page-load sequence.
  if (node.getBoundingClientRect().top < window.innerHeight) {
    play(delay);
    return {};
  }
  if (!('IntersectionObserver' in window)) return {};
  // Start just before it scrolls in, so it is never seen snapping to hidden.
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        play(0);
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px 12% 0px' },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}

/** Smooth-scroll to a section without relying on hash navigation. */
export function scrollToSection(event, id) {
  event?.preventDefault();
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  if (id === 'top') window.scrollTo({ top: 0, behavior });
  else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

/** 3D tilt towards the pointer with a moving sheen (--mx/--my for CSS). */
export function tilt(node, { max = 10, scale = 1.02 } = {}) {
  if (prefersReducedMotion() || !matchMedia('(hover: hover)').matches) return {};
  let raf = 0;
  const move = (e) => {
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      node.style.transform = `perspective(900px) rotateY(${(x - 0.5) * max * 2}deg) rotateX(${(0.5 - y) * max * 2}deg) scale(${scale})`;
      node.style.setProperty('--mx', `${x * 100}%`);
      node.style.setProperty('--my', `${y * 100}%`);
    });
  };
  const leave = () => {
    cancelAnimationFrame(raf);
    node.style.transform = '';
  };
  node.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  return {
    destroy() {
      cancelAnimationFrame(raf);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    },
  };
}

/** Calls `handler` on pointerdown outside the node. */
export function clickOutside(node, handler) {
  const onDown = (e) => {
    if (!node.contains(e.target)) handler(e);
  };
  document.addEventListener('pointerdown', onDown, true);
  return {
    update(h) {
      handler = h;
    },
    destroy: () => document.removeEventListener('pointerdown', onDown, true),
  };
}
