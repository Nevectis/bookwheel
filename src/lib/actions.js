// Small Svelte actions for motion and interaction.
import { prefersReducedMotion } from './ui.svelte.js';

/** Fade/slide an element in the first time it scrolls into view. */
export function reveal(node, delay = 0) {
  node.classList.add('reveal');
  node.style.setProperty('--reveal-delay', `${delay}ms`);
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    node.classList.add('in');
    return {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          node.classList.add('in');
          io.disconnect();
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
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
