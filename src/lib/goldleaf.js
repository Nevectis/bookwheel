// A quiet celebration: flakes of gold leaf drifting down instead of confetti.
import confetti from 'canvas-confetti';

const COLORS = ['#c9a66b', '#e3cf9f', '#a88449', '#f1e3c0', '#b8955a', '#d9bb7e'];

export function goldLeaf(canvas, { amount = 1 } = {}) {
  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  const leaf = { colors: COLORS, shapes: ['square'], scalar: 0.75, gravity: 0.42, drift: 0.15, decay: 0.935, ticks: 460 };
  fire({ ...leaf, particleCount: Math.round(70 * amount), spread: 110, startVelocity: 24, origin: { x: 0.5, y: 0.3 } });
  const later = setTimeout(() => {
    fire({ ...leaf, particleCount: Math.round(36 * amount), angle: 62, spread: 50, startVelocity: 30, origin: { x: 0, y: 0.55 } });
    fire({ ...leaf, particleCount: Math.round(36 * amount), angle: 118, spread: 50, startVelocity: 30, origin: { x: 1, y: 0.55 } });
  }, 260);
  return () => {
    clearTimeout(later);
    fire.reset();
  };
}
