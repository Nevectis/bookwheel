<script>
  // The spinning wheel. Slices show title + author only. When the set of books
  // changes, slices grow/shrink smoothly instead of jumping. `spin(id)` plays
  // the full animation and resolves once the wheel has stopped on that book.
  import { untrack } from 'svelte';
  import {
    easeInOutCubic,
    fitText,
    indexAtPointer,
    labelFontSize,
    landingRotation,
    mergeLayout,
    mod360,
    segmentAngles,
    spinEase,
  } from '../lib/wheel.js';
  import { prefersReducedMotion } from '../lib/ui.svelte.js';

  let {
    items = [],
    frozen = false,
    winnerId = null,
    spinning = false,
    disabled = false,
    ontick,
    onhub,
    hubLabel = '',
    emptyText = '',
  } = $props();

  const R = 236;
  const HUB = 46;
  const TEXT_LEN = R - HUB - 34;
  const COLORS = ['#8c2f45', '#c1902f', '#2f6f73', '#b4533c', '#5b4a9e', '#3f7a57', '#d27a24', '#34445a', '#b2456e', '#7a6a2e'];
  const BULBS = 28;

  let rotation = $state(0);
  let entries = $state([]);
  let pop = $state(0);
  let pointerEl = $state();
  let tweenRaf = 0;
  let spinRaf = 0;

  $effect(() => {
    const list = items;
    if (frozen) return;
    untrack(() => retarget(list));
  });

  function snap(list) {
    return list.map((it) => ({ id: it.id, item: it, from: 1, to: 1, weight: 1 }));
  }

  function retarget(list) {
    cancelAnimationFrame(tweenRaf);
    const prev = entries;
    const visible = prev.filter((e) => e.to > 0);
    if (!list.length) {
      entries = [];
      return;
    }
    if (!visible.length) {
      entries = snap(list);
      pop++;
      return;
    }
    const merged = mergeLayout(prev, list).map((e) => ({ ...e, weight: e.from }));
    if (prefersReducedMotion() || merged.every((e) => e.from === e.to)) {
      entries = snap(list);
      return;
    }
    entries = merged;
    const start = performance.now();
    const step = (now) => {
      const p = Math.max(0, Math.min(1, (now - start) / 800));
      const k = easeInOutCubic(p);
      for (const e of entries) e.weight = e.from + (e.to - e.from) * k;
      if (p < 1) tweenRaf = requestAnimationFrame(step);
      else entries = snap(entries.filter((e) => e.to > 0).map((e) => e.item));
    };
    tweenRaf = requestAnimationFrame(step);
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  // Stable colour per book, nudged so neighbours (and first/last) never match.
  const colors = $derived.by(() => {
    const out = [];
    const n = entries.length;
    entries.forEach((e, i) => {
      let c = hash(String(e.id)) % COLORS.length;
      const avoid = new Set([out[i - 1]]);
      if (i === n - 1 && n > 2) avoid.add(out[0]);
      while (avoid.has(c)) c = (c + 1) % COLORS.length;
      out.push(c);
    });
    return out.map((c) => COLORS[c]);
  });

  function inkOn(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.56 ? '#2a1a0e' : '#fff8ee';
  }

  const slices = $derived.by(() => {
    const angles = segmentAngles(entries.map((e) => e.weight));
    return entries
      .map((e, i) => {
        const a = angles[i];
        const fs = labelFontSize(a.span, R, { min: 7.5, max: 17 });
        const twoLines = ((a.span * Math.PI) / 180) * R * 0.62 >= fs * 2.35;
        return {
          id: e.id,
          ...a,
          color: colors[i],
          ink: inkOn(colors[i]),
          fs,
          twoLines,
          title: fitText(e.item?.title, fs, TEXT_LEN, 0.56),
          author: fitText(e.item?.author, fs * 0.78, TEXT_LEN, 0.5),
        };
      })
      .filter((s) => s.span > 0.05);
  });

  function arcPath(start, end, r) {
    if (end - start >= 359.99) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
    const a0 = ((start - 90) * Math.PI) / 180;
    const a1 = ((end - 90) * Math.PI) / 180;
    const large = end - start > 180 ? 1 : 0;
    return `M0 0L${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)}A${r} ${r} 0 ${large} 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)}Z`;
  }
  const polar = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  };

  function flick(strength) {
    const s = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0.5;
    pointerEl?.animate?.(
      [{ transform: `rotate(${-10 - 16 * s}deg)` }, { transform: 'rotate(0deg)' }],
      { duration: 160 + 120 * (1 - s), easing: 'cubic-bezier(.3,1.7,.5,1)' },
    );
  }

  /** Spin until `targetId` sits under the pointer. Resolves when stopped. */
  export function spin(targetId) {
    cancelAnimationFrame(tweenRaf);
    cancelAnimationFrame(spinRaf);
    entries = snap(entries.filter((e) => e.to > 0).map((e) => e.item));
    const angles = segmentAngles(entries.map((e) => e.weight));
    const idx = entries.findIndex((e) => e.id === targetId);
    if (idx < 0) return Promise.resolve(null);

    const reduced = prefersReducedMotion();
    const from = rotation;
    const to = landingRotation(from, angles[idx], {
      turns: reduced ? 1 : 5 + Math.floor(Math.random() * 3),
      offset: (Math.random() - 0.5) * 0.8,
    });
    const windup = reduced ? 0 : 450;
    const back = reduced ? 0 : 16;
    const duration = reduced ? 1100 : 5400 + Math.random() * 1500;
    const t0 = performance.now();
    let last = indexAtPointer(from, angles);
    let prevR = from;
    let prevT = t0;

    return new Promise((resolve) => {
      const step = (now) => {
        // rAF timestamps can predate t0 by a few ms; never let time run backwards.
        const el = Math.max(0, now - t0);
        let r;
        if (windup > 0 && el < windup) {
          const p = el / windup;
          r = from - back * (1 - Math.pow(1 - p, 3));
        } else {
          const p = Math.min(1, (el - windup) / duration);
          r = from - back + (to - from + back) * spinEase(p);
        }
        rotation = r;
        const i = indexAtPointer(r, angles);
        if (i !== last) {
          last = i;
          const speed = Math.min(1, Math.abs(r - prevR) / Math.max(1, now - prevT) / 1.2);
          try {
            flick(speed);
            ontick?.(speed);
          } catch (e) {
            console.warn(e); // a failed tick effect must never stop the wheel
          }
        }
        prevR = r;
        prevT = now;
        if (el < windup + duration) spinRaf = requestAnimationFrame(step);
        else {
          rotation = mod360(to);
          resolve(entries[idx].item);
        }
      };
      spinRaf = requestAnimationFrame(step);
    });
  }

  $effect(() => () => {
    cancelAnimationFrame(tweenRaf);
    cancelAnimationFrame(spinRaf);
  });
</script>

<div class="wheel-wrap" class:spinning class:has-winner={!!winnerId} class:empty={!slices.length}>
  {#key pop}
  <div class="disc">
    <svg viewBox="-260 -260 520 520" role="img" aria-label={hubLabel}>
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3d58e" />
          <stop offset="0.45" stop-color="#c1902f" />
          <stop offset="0.7" stop-color="#8e6420" />
          <stop offset="1" stop-color="#e2b85e" />
        </linearGradient>
        <radialGradient id="shade" r="0.5">
          <stop offset="0.55" stop-color="#000" stop-opacity="0" />
          <stop offset="0.93" stop-color="#000" stop-opacity="0.16" />
          <stop offset="1" stop-color="#000" stop-opacity="0.3" />
        </radialGradient>
        <radialGradient id="gloss" cx="0.32" cy="0.18" r="0.75">
          <stop offset="0" stop-color="#fff" stop-opacity="0.2" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.03" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>

      <circle r="257" fill="url(#rim)" />
      <circle r="250" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2" />
      <circle r={R + 3} fill="#3b2419" />

      {#if slices.length}
        <g class="rotor" transform="rotate({rotation})">
          {#each slices as s (s.id)}
            <g class="slice" class:win={s.id === winnerId}>
              <path d={arcPath(s.start, s.end, R)} fill={s.color} />
              {#if s.span > 2.4}
                <g transform="rotate({s.mid - 90})" fill={s.ink}>
                  <text
                    class="t-title"
                    x={R - 20}
                    y={s.twoLines ? -s.fs * 0.1 : s.fs * 0.36}
                    text-anchor="end"
                    font-size={s.fs}>{s.title}</text
                  >
                  {#if s.twoLines}
                    <text class="t-author" x={R - 20} y={s.fs * 0.98} text-anchor="end" font-size={s.fs * 0.78}>{s.author}</text>
                  {/if}
                </g>
              {/if}
            </g>
          {/each}
          {#if slices.length > 1 && slices.length <= 72}
            {#each slices as s (s.id)}
              {@const [x, y] = polar(s.start, R - 6)}
              <circle class="peg" cx={x} cy={y} r="3.4" />
            {/each}
          {/if}
          <circle r={R} fill="url(#shade)" pointer-events="none" />
        </g>
      {:else}
        <circle r={R} class="empty-disc" />
        <circle r={R - 26} class="empty-ring" />
        <text class="empty-text" y="-66" text-anchor="middle">{emptyText}</text>
      {/if}

      {#each Array(BULBS) as _, i}
        {@const [x, y] = polar((360 / BULBS) * i, 247.5)}
        <circle class="bulb" class:odd={i % 2} cx={x} cy={y} r="4.2" style:--i={i} />
      {/each}

      <circle r={R} fill="url(#gloss)" pointer-events="none" />
    </svg>

    <button class="hub" type="button" onclick={onhub} disabled={disabled || spinning} aria-label={hubLabel}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
      </svg>
    </button>
  </div>
  {/key}

  <div class="pointer" bind:this={pointerEl} aria-hidden="true">
    <svg viewBox="0 0 40 58">
      <path d="M4 2h32v34L20 56 4 36z" />
      <path class="pointer-shine" d="M8 6h9v28l-9-2z" />
      <circle cx="20" cy="15" r="5" />
    </svg>
  </div>
</div>

<style>
  .wheel-wrap {
    position: relative;
    width: min(100%, 520px);
    margin: 0 auto;
    aspect-ratio: 1;
    padding-top: 2%;
  }
  .disc {
    position: relative;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 22px 26px rgba(50, 25, 10, 0.28)) drop-shadow(0 4px 6px rgba(50, 25, 10, 0.2));
    animation: wheel-in 1.1s var(--ease-out) both;
  }
  @keyframes wheel-in {
    from {
      opacity: 0;
      transform: rotate(-80deg) scale(0.82);
    }
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
  .slice {
    transition:
      opacity 0.5s ease,
      filter 0.5s ease;
  }
  .has-winner .slice:not(.win) {
    opacity: 0.38;
    filter: saturate(0.5);
  }
  .slice.win {
    animation: win-glow 1.1s ease-in-out infinite alternate;
  }
  @keyframes win-glow {
    to {
      filter: brightness(1.22) saturate(1.15);
    }
  }
  .slice path {
    stroke: rgba(40, 20, 10, 0.25);
    stroke-width: 1;
  }
  .t-title {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.005em;
    font-variation-settings: 'SOFT' 60;
  }
  .t-author {
    font-family: var(--font-body);
    font-weight: 600;
    opacity: 0.86;
  }
  .peg {
    fill: #f3d58e;
    stroke: #7a531a;
    stroke-width: 1;
  }
  .empty-disc {
    fill: var(--card-2);
  }
  .empty-ring {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 2;
    stroke-dasharray: 6 9;
    animation: dash-spin 40s linear infinite;
    transform-origin: center;
  }
  @keyframes dash-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .empty-text {
    fill: var(--ink-soft);
    font-family: var(--font-display);
    font-size: 22px;
    font-style: italic;
  }
  .bulb {
    fill: #fff3c9;
    stroke: #8e6420;
    stroke-width: 1;
    animation: twinkle 2.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.17s);
  }
  .bulb.odd {
    animation-delay: calc(var(--i) * -0.17s - 1.2s);
  }
  @keyframes twinkle {
    0%,
    100% {
      fill: #fff3c9;
      filter: drop-shadow(0 0 3px #ffd97a);
    }
    50% {
      fill: #caa25a;
      filter: none;
    }
  }
  .spinning .bulb {
    animation: chase 0.56s linear infinite;
    animation-delay: calc(var(--i) * -0.02s);
  }
  @keyframes chase {
    0%,
    60% {
      fill: #caa25a;
      filter: none;
    }
    70%,
    90% {
      fill: #fffbe8;
      filter: drop-shadow(0 0 5px #ffe08a);
    }
  }
  .has-winner .bulb {
    animation: celebrate 0.5s steps(1) infinite;
  }
  .has-winner .bulb.odd {
    animation-delay: 0.25s;
  }
  @keyframes celebrate {
    0% {
      fill: #fffbe8;
      filter: drop-shadow(0 0 6px #ffe08a);
    }
    50% {
      fill: #b98a3c;
      filter: none;
    }
  }

  .hub {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 19%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 35% 30%, #fffaf0, #f3e2c1 55%, #d9bd86 100%);
    box-shadow:
      0 0 0 5px #c1902f,
      0 0 0 7px #7a531a,
      0 8px 18px rgba(40, 20, 8, 0.45),
      inset 0 -4px 8px rgba(120, 80, 20, 0.25);
    transition:
      transform 0.25s var(--ease-spring),
      box-shadow 0.25s ease;
  }
  .hub svg {
    width: 46%;
    height: 46%;
    fill: none;
    stroke: #8c2f45;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .hub:hover:not(:disabled) {
    transform: translate(-50%, -50%) scale(1.08) rotate(-6deg);
  }
  .hub:active:not(:disabled) {
    transform: translate(-50%, -50%) scale(0.95);
  }
  .hub:disabled {
    cursor: default;
  }
  .spinning .hub svg {
    animation: hub-pulse 0.9s ease-in-out infinite alternate;
  }
  @keyframes hub-pulse {
    to {
      transform: scale(0.86);
    }
  }

  .pointer {
    position: absolute;
    top: -1.2%;
    left: 50%;
    width: 8.4%;
    margin-left: -4.2%;
    transform-origin: 50% 12%;
    z-index: 2;
    filter: drop-shadow(0 4px 4px rgba(40, 15, 10, 0.4));
  }
  .pointer svg path:first-child {
    fill: #9c3550;
    stroke: #5a1a2b;
    stroke-width: 1.5;
  }
  .pointer-shine {
    fill: rgba(255, 255, 255, 0.22);
  }
  .pointer circle {
    fill: #f3d58e;
    stroke: #7a531a;
    stroke-width: 1.5;
  }
  .empty .disc {
    filter: drop-shadow(0 12px 20px rgba(50, 25, 10, 0.16));
  }
</style>
